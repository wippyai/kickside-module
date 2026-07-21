-- Lifecycle test for the starter log sink: the port is published, the write
-- persists a row and acknowledges per the kickside.data:writable ABI.
local test = require("test")
local funcs = require("funcs")
local registry = require("registry")
local security = require("security")
local repo = require("repo")

local WRITE_ID = "acme.starter:log_write"
local SINK_ID = "acme.starter:log_sink"
local PORT_ID = "acme.starter:log"

local function executor(actor_id)
    return funcs.new():with_actor(security.new_actor(actor_id, {}))
end

local function define_tests()
    test.describe("acme.starter log sink", function()
        test.it("publishes the log port bound to the writable sink", function()
            local entry, err = registry.get(PORT_ID)
            test.is_nil(err)
            test.not_nil(entry, PORT_ID .. " is missing")

            local sink, sink_err = registry.get(SINK_ID)
            test.is_nil(sink_err)
            test.not_nil(sink, SINK_ID .. " is missing")
        end)

        test.it("acknowledges a write and stamps the configured label", function()
            local res, err = executor("starter-test-user"):call(WRITE_ID, {
                sink_op = "upsert",
                idempotency_key = "starter-t-1",
                config = { label = "TEST" },
                input = { content = "hello from the lifecycle test" },
            })
            test.is_nil(err)
            test.not_nil(res)
            test.is_true(res.success, "write did not acknowledge")
            test.eq(res.result, "created")
            test.eq(res.dest_ref.label, "TEST")
            test.not_nil(res.dest_ref.id, "created result must carry the row id")
        end)

        test.it("persists one row per acknowledged write", function()
            local counted, berr = repo.count()
            test.is_nil(berr)
            local before = tonumber(counted) or 0

            local res, err = executor("starter-test-user"):call(WRITE_ID, {
                sink_op = "upsert",
                idempotency_key = "starter-t-2",
                input = { content = "row persisted by the suite" },
            })
            test.is_nil(err)
            test.is_true(res.success, "write did not acknowledge")

            local after, aerr = repo.count()
            test.is_nil(aerr)
            test.eq(after, before + 1, "write must insert exactly one row")
        end)

        test.it("rejects a write without content", function()
            local res, err = executor("starter-test-user"):call(WRITE_ID, {
                sink_op = "upsert",
                input = {},
            })
            test.is_nil(err)
            test.eq(res.success, false)
            test.is_nil(res.result, "failure envelope must not carry result")
            test.not_nil(res.error)
            test.eq(res.error.scope, "item")
            test.eq(res.error.retriable, false)
        end)
    end)
end

local run_cases = test.run_cases(define_tests)
return { run = function(options) return run_cases(options) end }
