import { accountStore } from "#api/accounts/runtime";
import { ConnectionDropStore } from "#api/connections/ConnectionDropStore";
import { hasDatabaseConfig } from "#api/db/hasDatabaseConfig";

export const connectionDropStore = hasDatabaseConfig(process.env) ? new ConnectionDropStore(accountStore) : undefined;
