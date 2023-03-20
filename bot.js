import crypto from "crypto";
import {
  MatrixClient,
  SimpleFsStorageProvider,
  AutojoinRoomsMixin,
  MatrixAuth,
  RustSdkCryptoStorageProvider,
} from "matrix-bot-sdk";
export default async (db) => {
  const homeserverUrl = "https://" + process.env.MATRIX_SERVER;
  const accessToken = process.env.MATRIX_TOKEN;
  const storage = new SimpleFsStorageProvider(".data/bot.json");
  const cryptoProvider = new RustSdkCryptoStorageProvider(".data/crypto");
  const client = new MatrixClient(
    homeserverUrl,
    accessToken,
    storage,
    cryptoProvider
  );
  AutojoinRoomsMixin.setupOnClient(client);
  client.on("room.join", async (roomId, event) => {
    const token = crypto.randomBytes(20).toString("base64url");
    await db.put(token + "-room", roomId);
    await client.sendHtmlText(
      roomId,
      `Your Notify token is <code>${token}</code>`
    );
  });
  async function cleanup() {
    try {
      console.log("cleaning up")
      const rooms = await client.getJoinedRooms();
      const roomsWithTokens = {};
      for await (const [key, val] of db.iterator()) {
        if (rooms.includes(val)) {
          roomsWithTokens[val] = key;
        } else {
          console.log("deleting token for missing room "+room)
          await db.del(key);
        }
      }
      for (const room of rooms) {
        try {
          if (
            (await client.getRoomMembersByMembership(room, "join")).filter(
              (e) => e.membershipFor !== client.userId
            ).length < 1
          ) {
            console.log("deleting token for empty room "+room)
            await db.del(roomsWithTokens[room]);
            delete roomsWithTokens[room];
          }
        } catch (e) {
          console.error(e);
        }
        if (!roomsWithTokens[room])
          try {
            console.log("leaving tokenless room "+room)
            await client.leaveRoom(room);
          } catch (e) {
            console.error(e);
          }
      }
    } catch (e) {
      console.error(e);
    }
    console.log("done cleaning up")
    setTimeout(cleanup, 1000 * 60 * 10);
  }
  await client.start();
  cleanup();
  return client;
};
