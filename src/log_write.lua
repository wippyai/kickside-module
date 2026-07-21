-- kickside.data:writable sink that persists each written item and logs it to
-- the runtime console.
local logger = require("logger")
local repo = require("repo")

local log = logger:named("starter.log")

local function fail(code, message, retriable, scope)
    return {
        success = false,
        error = {
            code = code,
            message = tostring(message),
            retriable = retriable == true,
            scope = scope or "item",
        },
    }
end

local function write(req)
    req = type(req) == "table" and req or {}
    local config = type(req.config) == "table" and req.config or {}
    local input = type(req.input) == "table" and req.input or {}

    local sink_op = type(req.sink_op) == "string" and req.sink_op or "upsert"
    if sink_op ~= "upsert" then return fail("invalid_request", "unsupported sink operation: " .. sink_op, false) end

    local content = input.content
    if content == nil or content == "" then return fail("invalid_request", "write requires input.content", false) end

    local label = config.label
    if type(label) ~= "string" or label == "" then label = "LOG" end

    local id, err = repo.insert(label, tostring(content))
    if err then return fail("provider_unavailable", err, true, "flow") end

    log:info("log write", { label = label, content = tostring(content), key = req.idempotency_key })
    return { success = true, result = "created", dest_ref = { id = id, label = label } }
end

return { write = write }
