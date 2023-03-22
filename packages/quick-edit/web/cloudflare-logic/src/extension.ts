import * as vscode from "vscode";
import { CFS } from "./cfs";
import {
	Channel,
	FromQuickEditMessage,
	ToQuickEditMessage,
	WorkerLoadedMessage,
} from "./ipc";

export function activate(context: vscode.ExtensionContext) {
	const channel = Channel<FromQuickEditMessage, ToQuickEditMessage>(
		context.messagePassingProtocol!
	);
	const cfs = new CFS(channel);
	context.subscriptions.push(cfs);

	channel.onMessage((data) => {
		if (data.type === "WorkerLoaded") {
			console.log("WorkerLoaded", data.body);
			cfs.seed(data.body);
		}
	});
}

export function deactivate() {}
