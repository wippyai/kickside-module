local sql = require("sql")
local time = require("time")

-- Wait for the bootloader to migrate app:db before the suites run; the module
-- owns acme_starter_log_entries, so its presence proves the migration applied.
local function run()
    for _ = 1, 300 do
        local db, err = sql.get("app:db")
        if not err and db then
            local _, qerr = db:query("SELECT COUNT(*) FROM acme_starter_log_entries")
            db:release()
            if not qerr then return true end
        end
        time.sleep("100ms")
    end
    error("acme_starter_log_entries did not come online within 30s")
end

return { run = run }
