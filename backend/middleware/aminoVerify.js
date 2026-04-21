const { sha256 } = require("@cosmjs/crypto");
const { fromBase64, toUtf8 } = require("@cosmjs/encoding");

/**
 * Verifies a Cosmos Amino signature
 * @param {string} signature - Base64 encoded signature
 * @param {string} message - The message that was signed
 * @param {string} address - The Cosmos address (bech32)
 * @returns {Promise<boolean>} - True if signature is valid
 */
async function verifyAminoSignature(signature, message, address) {
  try {
    // Decode the base64 signature
    const signatureBytes = fromBase64(signature);

    if (signatureBytes.length !== 64) {
      console.error("Invalid signature length:", signatureBytes.length);
      return false;
    }

    // The signature is the concatenation of r (32 bytes) and s (32 bytes)
    const r = signatureBytes.slice(0, 32);
    const s = signatureBytes.slice(32, 64);

    // Hash the message
    const messageHash = sha256(toUtf8(message));

    // For Amino signing, we need to verify using secp256k1
    const { Secp256k1Signature } = require("@cosmjs/crypto");
    const { bech32 } = require("bech32");

    // Create signature object
    const secpSignature = Secp256k1Signature.fromFixedLength(signatureBytes);

    // Get public key from signature recovery
    const recoveredPubkey = secpSignature.recoverPubkey(messageHash);

    if (!recoveredPubkey) {
      console.error("Could not recover public key");
      return false;
    }

    // Hash the public key to get the address
    const pubkeyHash = sha256(recoveredPubkey);
    const trimmedHash = pubkeyHash.slice(0, 20);

    // Decode the provided address
    const { prefix, words } = bech32.decode(address);

    // Convert words to bytes
    const addressBytes = new Uint8Array(bech32.fromWords(words));

    // Compare
    const isValid = arraysEqual(trimmedHash, addressBytes);

    if (!isValid) {
      console.error("Address mismatch");
      console.error("Expected:", Buffer.from(addressBytes).toString("hex"));
      console.error("Got:", Buffer.from(trimmedHash).toString("hex"));
    }

    return isValid;
  } catch (error) {
    console.error("Amino signature verification error:", error);
    return false;
  }
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

module.exports = { verifyAminoSignature };
