const fs = require("fs");
const path = "app/api/v1/tournaments/[id]/stages/route.ts";
let content = fs.readFileSync(path, "utf8");

const replacement = `let parsedVetoFormat = veto_format;
    if (!parsedVetoFormat || Object.keys(parsedVetoFormat).length === 0) {
      parsedVetoFormat = {
        sequence: ["BAN", "BAN", "PICK", "PICK", "DECIDER"],
        team_a_first: true,
        time_limit_seconds: 60
      };
    }`;

content = content.replace(
  "const { name, stage_order, format, teams_in, teams_advancing, format_config, best_of_config, map_pool, veto_format, start_at } = body;",
  "const { name, stage_order, format, teams_in, teams_advancing, format_config, best_of_config, map_pool, veto_format, start_at } = body;\n\n    " + replacement
);

content = content.replace(
  "veto_format: toJson(veto_format ?? {}),",
  "veto_format: toJson(parsedVetoFormat),"
);

fs.writeFileSync(path, content, "utf8");
