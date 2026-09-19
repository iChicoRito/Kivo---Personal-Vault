mod database;
mod security;
mod vault;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            use tauri::Manager;

            let data_dir = app.path().app_local_data_dir()?;
            let database =
                database::DatabaseState::new(data_dir.join("kivo.db"), data_dir.join("files"));

            // Try migration during startup. Failed attempts remain retryable through the command.
            let _ = database.initialize();
            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            database::initialize_database,
            database::load_boot_state,
            database::complete_setup,
            database::load_profile,
            database::save_profile,
            database::load_preferences,
            database::save_preferences,
            database::set_password_verifier,
            database::remove_password_verifier,
            database::load_password_verifier,
            database::has_password_verifier,
            security::hash_password,
            security::verify_password,
            vault::import_file,
            vault::save_item,
            vault::load_item,
            vault::list_items,
            vault::set_item_tags,
            vault::list_collections,
            vault::list_activity,
            vault::list_index_state,
            vault::set_item_pinned,
            vault::set_items_favorite,
            vault::move_items_to_collection,
            vault::trash_items,
            vault::restore_items,
            vault::delete_items_permanently,
            vault::mark_item_opened,
            vault::list_recent_items,
            vault::load_vault_summary,
            vault::save_collection,
            vault::delete_collection,
            vault::list_tags,
            vault::save_tag,
            vault::delete_tag,
            vault::pick_file,
            vault::open_item_file,
            vault::reveal_item_file,
            vault::open_source_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Kivo")
}
