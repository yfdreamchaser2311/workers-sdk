import { fetchResult } from "../../cfetch";
import { withConfig } from "../../config";
import { logger } from "../../logger";
import { requireAuth } from "../../user";
import { Database } from "../options";
import { getDatabaseByNameOrBinding } from "../utils";
import type {
	CommonYargsArgv,
	StrictYargsOptionsToInterface,
} from "../../yargs-types";

export function InfoOptions(yargs: CommonYargsArgv) {
	return (
		Database(yargs)
			// .option("bookmark", {
			// 	describe: "Bookmark to use for time travel",
			// 	type: "string",
			// })
			.option("timestamp", {
				describe: "Timestamp to use for time travel",
				type: "string",
			})
			.option("json", {
				describe: "return output as clean JSON",
				type: "boolean",
				default: false,
			})
	);
	// .check(function (argv) {
	// 	if (
	// 		(argv.timestamp && !argv.bookmark) ||
	// 		(!argv.timestamp && argv.bookmark)
	// 	) {
	// 		return true;
	// 	} else if (argv.timestamp && argv.bookmark) {
	// 		throw new Error(
	// 			"Provide either a timestamp, or a bookmark - not both."
	// 		);
	// 	} else {
	// 		throw new Error("Provide either a timestamp or a bookmark");
	// 	}
	// });
}

type HandlerOptions = StrictYargsOptionsToInterface<typeof InfoOptions>;

export const InfoHandler = withConfig<HandlerOptions>(
	async ({ database, config, json, timestamp }): Promise<void> => {
		// bookmark
		const accountId = await requireAuth(config);
		const db = await getDatabaseByNameOrBinding(config, accountId, database);
		const searchParams = new URLSearchParams();

		if (timestamp) {
			searchParams.set("timestamp", timestamp);
		}
		const result = await fetchResult<Record<string, string>>(
			`/accounts/${accountId}/d1/database/${
				db.uuid
			}/time-travel/bookmark?${searchParams.toString()}`,
			{
				headers: {
					"Content-Type": "application/json",
				},
			}
		);

		if (json) {
			logger.log(JSON.stringify(result, null, 2));
		} else {
			logger.log("🚧 Time Traveling...");
			logger.log(`⚠️ Timestamp corresponds with bookmark '${result.bookmark}'`);
			logger.log(`⚡️ To restore to this specific bookmark, run:\n \`wrangler d1 time-travel restore ${database} --bookmark=${result.bookmark}\`
      `);
		}
	}
);
