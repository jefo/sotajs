import { FeaturePorts } from "../../../../lib";
import { LoggingFeature } from "../../application/features/logging.feature";

export class ConsoleLoggerAdapter
	implements FeaturePorts<typeof LoggingFeature>
{
	async logger(input: {
		level: "info" | "warn" | "error";
		message: string;
		context?: Record<string, any>;
	}): Promise<void> {
		const emoji = {
			info: "i",
			warn: "!",
			error: "❌",
		}[input.level];

		const contextStr = input.context
			? ` | ${JSON.stringify(input.context)}`
			: "";
		console.log(
			`${emoji} [${input.level.toUpperCase()}] ${input.message}${contextStr}`,
		);
	}
}
