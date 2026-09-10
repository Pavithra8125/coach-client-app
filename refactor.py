import re
import os

files = [
    "server/src/routes/auth.js",
    "server/src/routes/checkins.js",
    "server/src/routes/clients.js",
    "server/src/routes/coachNotes.js",
    "server/src/routes/diet.js",
    "server/src/routes/exercises.js",
    "server/src/routes/gamification.js",
    "server/src/routes/measurements.js",
    "server/src/routes/progress.js",
    "server/src/routes/workouts.js",
]

def refactor():
    for filepath in files:
        if not os.path.exists(filepath):
            continue
        with open(filepath, "r") as f:
            content = f.read()

        # Route async
        content = re.sub(r"router\.(get|post|put|delete|patch)\(([^,]+),\s*(?:requireAuth,\s*)?\(req,\s*res\)\s*=>\s*\{", 
                         lambda m: m.group(0).replace('(req, res) => {', 'async (req, res) => {'), content)
        content = re.sub(r"router\.(get|post|put|delete|patch)\(([^,]+),\s*(?:requireAuth,\s*)?\(req,\s*res,\s*next\)\s*=>\s*\{", 
                         lambda m: m.group(0).replace('(req, res, next) => {', 'async (req, res, next) => {'), content)
        
        content = content.replace("function requireClient(req, res) {", "async function requireClient(req, res) {")
        content = content.replace("if (!requireClient(req, res)) return;", "if (!(await requireClient(req, res))) return;")

        # Custom replacements for db.prepare
        # Instead of generic regex, we can find db.prepare
        # But wait, we can just replace db.prepare(`...`).get(...)
        # Let's match db.prepare carefully
        
        # We will split the file by db.prepare and manually reconstruct to avoid regex edge cases.
        # Too complex. Let's use robust regex.
        
        def replacer(m):
            sql = m.group(1)
            method = m.group(2)
            args = m.group(3)
            if method == "get":
                if args:
                    return f"(await db.execute({{ sql: {sql}, args: [{args}] }})).rows[0]"
                else:
                    return f"(await db.execute({{ sql: {sql}, args: [] }})).rows[0]"
            elif method == "all":
                if args:
                    return f"(await db.execute({{ sql: {sql}, args: [{args}] }})).rows"
                else:
                    return f"(await db.execute({{ sql: {sql}, args: [] }})).rows"
            elif method == "run":
                if args:
                    return f"await db.execute({{ sql: {sql}, args: [{args}] }})"
                else:
                    return f"await db.execute({{ sql: {sql}, args: [] }})"

        # db.prepare(SQL).method(ARGS)
        # SQL can be '...' or `...`
        # ARGS can have parenthesis, so we match matching parenthesis for the method call.
        
        # Actually, python's regex engine doesn't support recursive parenthesis matching easily without 'regex' module.
        # But we know ARGS don't contain deep parenthesis in this codebase, except maybe `req.params.clientId` or `...params`.
        pass
