//! HTTP adapter over `zeroclaw_runtime::browse::list_directory`.
//!
//! `GET /api/browse?path=<relative-to-shared>` returns one level of
//! children. All walking, containment, and sorting lives in the runtime
//! browse module; this is request shape → service call → response shape.

use axum::{
    Json,
    extract::{Multipart, Path as AxumPath, Query, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
};
use base64::Engine;
use serde::{Deserialize, Serialize};
use zeroclaw_runtime::browse::{
    BrowseEntry, BrowseError, create_file, delete_agent_workspace_path, delete_shared_path,
    list_agent_workspace, list_directory, make_agent_workspace_directory, make_directory,
    move_agent_workspace_path, move_shared_path, read_agent_workspace_file, read_shared_file,
    remove_directory, write_file,
};

use super::AppState;
use super::api::require_auth;

#[derive(Debug, Deserialize, Default)]
pub struct BrowseQuery {
    /// Path relative to `<install>/shared/`. Empty / unset = shared/ root.
    #[serde(default)]
    pub path: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BrowseResponse {
    pub path: String,
    pub entries: Vec<BrowseEntry>,
}

/// `GET /api/browse?path=<relative-to-shared>`
pub async fn handle_browse(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(q): Query<BrowseQuery>,
) -> Response {
    if let Err(e) = require_auth(&state, &headers) {
        return e.into_response();
    }
    let config = state.config.read().clone();
    let raw = q.path.unwrap_or_default();
    match list_directory(&config, &raw) {
        Ok(result) => Json(BrowseResponse {
            path: result.path,
            entries: result.entries,
        })
        .into_response(),
        Err(err) => browse_error_response(err),
    }
}

fn browse_error_response(err: BrowseError) -> Response {
    let status = match &err {
        BrowseError::Escape(_) => StatusCode::BAD_REQUEST,
        BrowseError::NotFound(_) => StatusCode::NOT_FOUND,
        BrowseError::NotADirectory(_) => StatusCode::BAD_REQUEST,
        BrowseError::Protected(_) => StatusCode::FORBIDDEN,
        BrowseError::ProtectedFile(_) => StatusCode::FORBIDDEN,
        BrowseError::TooLarge(_, _) => StatusCode::PAYLOAD_TOO_LARGE,
        BrowseError::Io(_) => StatusCode::INTERNAL_SERVER_ERROR,
    };
    (
        status,
        Json(serde_json::json!({ "error": format!("{}", err) })),
    )
        .into_response()
}

#[derive(Debug, Deserialize)]
pub struct BrowsePathBody {
    pub path: String,
}

/// `POST /api/browse/mkdir` — create a directory under `<install>/shared/`.
pub async fn handle_browse_mkdir(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<BrowsePathBody>,
) -> Response {
    if let Err(e) = require_auth(&state, &headers) {
        return e.into_response();
    }
    let config = state.config.read().clone();
    match make_directory(&config, &body.path) {
        Ok(()) => Json(serde_json::json!({ "created": body.path })).into_response(),
        Err(err) => browse_error_response(err),
    }
}

/// `DELETE /api/browse/rmdir` — recursively remove a directory under
/// `<install>/shared/`. Refuses protected top-level entries.
pub async fn handle_browse_rmdir(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<BrowsePathBody>,
) -> Response {
    if let Err(e) = require_auth(&state, &headers) {
        return e.into_response();
    }
    let config = state.config.read().clone();
    match remove_directory(&config, &body.path) {
        Ok(()) => Json(serde_json::json!({ "removed": body.path })).into_response(),
        Err(err) => browse_error_response(err),
    }
}

// ── Agent workspace ──────────────────────────────────────────────────────

/// `GET /api/agents/{alias}/workspace/list?path=<rel>` — one level under
/// `<install>/agents/{alias}/workspace/<rel>`.
pub async fn handle_agent_workspace_list(
    State(state): State<AppState>,
    headers: HeaderMap,
    AxumPath(alias): AxumPath<String>,
    Query(q): Query<BrowseQuery>,
) -> Response {
    if let Err(e) = require_auth(&state, &headers) {
        return e.into_response();
    }
    let config = state.config.read().clone();
    let raw = q.path.unwrap_or_default();
    match list_agent_workspace(&config, &alias, &raw) {
        Ok(result) => Json(BrowseResponse {
            path: result.path,
            entries: result.entries,
        })
        .into_response(),
        Err(err) => browse_error_response(err),
    }
}

#[derive(Debug, Serialize)]
pub struct FileReadResponse {
    pub path: String,
    pub size: u64,
    pub is_text: bool,
    /// UTF-8 text when `is_text` is true, base64 when false. Lets the
    /// dashboard render inline without a second round-trip for binary
    /// previews.
    pub content: String,
    pub encoding: &'static str,
}

/// `GET /api/agents/{alias}/workspace/read?path=<rel>` — read a single
/// file. Bounded by `AGENT_WORKSPACE_READ_CAP`.
pub async fn handle_agent_workspace_read(
    State(state): State<AppState>,
    headers: HeaderMap,
    AxumPath(alias): AxumPath<String>,
    Query(q): Query<BrowseQuery>,
) -> Response {
    if let Err(e) = require_auth(&state, &headers) {
        return e.into_response();
    }
    let config = state.config.read().clone();
    let raw = q.path.unwrap_or_default();
    match read_agent_workspace_file(&config, &alias, &raw) {
        Ok(result) => {
            let (content, encoding) = if result.is_text {
                (String::from_utf8(result.bytes).unwrap_or_default(), "utf8")
            } else {
                (
                    base64::engine::general_purpose::STANDARD.encode(&result.bytes),
                    "base64",
                )
            };
            Json(FileReadResponse {
                path: result.path,
                size: result.size,
                is_text: result.is_text,
                content,
                encoding,
            })
            .into_response()
        }
        Err(err) => browse_error_response(err),
    }
}

/// `DELETE /api/agents/{alias}/workspace/path` body `{ path: "<rel>" }`.
pub async fn handle_agent_workspace_delete(
    State(state): State<AppState>,
    headers: HeaderMap,
    AxumPath(alias): AxumPath<String>,
    Json(body): Json<BrowsePathBody>,
) -> Response {
    if let Err(e) = require_auth(&state, &headers) {
        return e.into_response();
    }
    let config = state.config.read().clone();
    match delete_agent_workspace_path(&config, &alias, &body.path) {
        Ok(()) => Json(serde_json::json!({ "removed": body.path })).into_response(),
        Err(err) => browse_error_response(err),
    }
}

#[derive(Debug, Deserialize)]
pub struct MoveBody {
    pub from: String,
    pub to: String,
}

/// `POST /api/agents/{alias}/workspace/move` body `{ from, to }`.
pub async fn handle_agent_workspace_move(
    State(state): State<AppState>,
    headers: HeaderMap,
    AxumPath(alias): AxumPath<String>,
    Json(body): Json<MoveBody>,
) -> Response {
    if let Err(e) = require_auth(&state, &headers) {
        return e.into_response();
    }
    let config = state.config.read().clone();
    match move_agent_workspace_path(&config, &alias, &body.from, &body.to) {
        Ok(()) => Json(serde_json::json!({ "from": body.from, "to": body.to })).into_response(),
        Err(err) => browse_error_response(err),
    }
}

/// `POST /api/agents/{alias}/workspace/mkdir` body `{ path: "<rel>" }`.
pub async fn handle_agent_workspace_mkdir(
    State(state): State<AppState>,
    headers: HeaderMap,
    AxumPath(alias): AxumPath<String>,
    Json(body): Json<BrowsePathBody>,
) -> Response {
    if let Err(e) = require_auth(&state, &headers) {
        return e.into_response();
    }
    let config = state.config.read().clone();
    match make_agent_workspace_directory(&config, &alias, &body.path) {
        Ok(()) => Json(serde_json::json!({ "created": body.path })).into_response(),
        Err(err) => browse_error_response(err),
    }
}

// ── Shared file upload ────────────────────────────────────────────────────

/// `POST /api/browse/upload` — multipart file upload into
/// `<install>/shared/<path>/<filename>`. The optional `path` form field
/// specifies a subdirectory under shared/.
pub async fn handle_browse_upload(
    State(state): State<AppState>,
    headers: HeaderMap,
    mut multipart: Multipart,
) -> Response {
    if let Err(e) = require_auth(&state, &headers) {
        return e.into_response();
    }
    let mut data: Vec<u8> = Vec::new();
    let mut file_name = String::from("upload");
    let mut sub_path = String::new();

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        if name == "file" {
            file_name = field
                .file_name()
                .unwrap_or("upload")
                .to_string();
            match field.bytes().await {
                Ok(bytes) => data = bytes.to_vec(),
                Err(e) => {
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(serde_json::json!({ "error": format!("read error: {e}") })),
                    )
                        .into_response();
                }
            }
        } else if name == "path" {
            match field.text().await {
                Ok(s) => sub_path = s,
                Err(_) => {}
            }
        }
    }

    if data.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "no file data received" })),
        )
            .into_response();
    }

    let relative = if sub_path.is_empty() {
        file_name.clone()
    } else {
        format!("{}/{}", sub_path.trim_end_matches('/'), file_name)
    };

    let config = state.config.read().clone();
    match write_file(&config, &relative, &data) {
        Ok(size) => {
            Json(serde_json::json!({ "uploaded": relative, "size": size })).into_response()
        }
        Err(err) => browse_error_response(err),
    }
}

/// `GET /api/browse/read?path=<relative-to-shared>` — read a file from shared.
pub async fn handle_browse_read(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(q): Query<BrowseQuery>,
) -> Response {
    if let Err(e) = require_auth(&state, &headers) {
        return e.into_response();
    }
    let config = state.config.read().clone();
    let raw = q.path.unwrap_or_default();
    match read_shared_file(&config, &raw) {
        Ok(result) => {
            let (content, encoding) = if result.is_text {
                (String::from_utf8(result.bytes).unwrap_or_default(), "utf8")
            } else {
                (
                    base64::engine::general_purpose::STANDARD.encode(&result.bytes),
                    "base64",
                )
            };
            Json(FileReadResponse {
                path: result.path,
                size: result.size,
                is_text: result.is_text,
                content,
                encoding,
            })
            .into_response()
        }
        Err(err) => browse_error_response(err),
    }
}

/// `DELETE /api/browse/path` body `{ path: "<rel>" }` — delete a file
/// or directory under shared/.
pub async fn handle_browse_delete(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<BrowsePathBody>,
) -> Response {
    if let Err(e) = require_auth(&state, &headers) {
        return e.into_response();
    }
    let config = state.config.read().clone();
    match delete_shared_path(&config, &body.path) {
        Ok(()) => Json(serde_json::json!({ "removed": body.path })).into_response(),
        Err(err) => browse_error_response(err),
    }
}

/// `POST /api/browse/move` body `{ from, to }` — rename or move a path
/// under shared/.
pub async fn handle_browse_move(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<MoveBody>,
) -> Response {
    if let Err(e) = require_auth(&state, &headers) {
        return e.into_response();
    }
    let config = state.config.read().clone();
    match move_shared_path(&config, &body.from, &body.to) {
        Ok(()) => Json(serde_json::json!({ "from": body.from, "to": body.to })).into_response(),
        Err(err) => browse_error_response(err),
    }
}

/// `POST /api/browse/mkfile` body `{ path: "<rel>" }` — create an empty
/// file under shared/.
pub async fn handle_browse_mkfile(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<BrowsePathBody>,
) -> Response {
    if let Err(e) = require_auth(&state, &headers) {
        return e.into_response();
    }
    let config = state.config.read().clone();
    match create_file(&config, &body.path) {
        Ok(created) => Json(serde_json::json!({ "created": created })).into_response(),
        Err(err) => browse_error_response(err),
    }
}
