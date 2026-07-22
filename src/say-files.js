const DOWNLOAD_TIMEOUT_MS = 60_000;
const UPLOAD_TIMEOUT_MS = 60_000;

async function downloadFile(file) {
  const response = await fetch(file.attachment, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS)
  });
  if (!response.ok) {
    throw new Error(`Nie udało się pobrać ${file.name}: HTTP ${response.status}`);
  }
  const data = Buffer.from(await response.arrayBuffer());
  return {
    attachment: data,
    name: file.name,
    description: file.description
  };
}

async function prepareSayFiles(files) {
  return Promise.all(files.map(downloadFile));
}

async function sendRequest(channelId, embeds, files) {
  const payload = {
    embeds: embeds.map(embed => typeof embed.toJSON === 'function' ? embed.toJSON() : embed),
    attachments: files.map((file, id) => ({
      id,
      filename: file.name,
      description: file.description
    }))
  };
  const form = new FormData();
  form.append('payload_json', JSON.stringify(payload));
  for (const [index, file] of files.entries()) {
    form.append(`files[${index}]`, new Blob([file.attachment]), file.name);
  }

  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` },
    body: form,
    signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS)
  });
  if (!response.ok) {
    const details = await response.json().catch(() => null);
    const error = new Error(details?.message ?? `Discord API: HTTP ${response.status}`);
    error.code = details?.code;
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function sendSayMessage(channelId, message, files, onProgress) {
  if (!files.length) return sendRequest(channelId, message.embeds, []);

  const sentMessages = [];
  for (const [index, file] of files.entries()) {
    const result = await sendRequest(channelId, index === 0 ? message.embeds : [], [file]);
    sentMessages.push(result);
    if (onProgress) await onProgress(index + 1, files.length);
  }
  return sentMessages;
}

module.exports = { prepareSayFiles, sendSayMessage };

