import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

/**
 * Function generates a JaaS JWT.
 */
const generateJaaSJWT = (
  privateKey,
  { id, name, email, avatar, appId, kid }
) => {
  const now = new Date();
  const jwtPayload = {
    aud: "jitsi",
    context: {
      user: {
        id,
        name,
        avatar,
        email: email,
        moderator: "true",
      },
      features: {
        livestreaming: "true",
        recording: "true",
        transcription: "true",
        "outbound-call": "true",
      },
    },
    iss: "chat",
    room: "*",
    sub: appId,
    exp: Math.round(now.setHours(now.getHours() + 3) / 1000),
    nbf: Math.round(new Date().getTime() / 1000) - 10,
  };

  const jwtOptions = {
    algorithm: "RS256",
    header: { kid },
  };

  return jwt.sign(jwtPayload, privateKey, jwtOptions);
};

/**
 * Generate a new JWT for JaaS.
 */
export const generateJWT = (userData, appId, kid, privateKey) => {
  const token = generateJaaSJWT(privateKey, {
    id: userData._id || randomUUID(),
    name: userData.name || userData.username || "User",
    email: userData.email || "",
    avatar: userData.avatar || "",
    appId: appId,
    kid: kid,
  });

  return token;
};

export default generateJWT;
