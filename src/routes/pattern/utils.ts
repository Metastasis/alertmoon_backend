export function mapAxios(response: any) {
  return {
    status: response.status,
    statusText: response.statusText,
    headers: maskHeaders(response.headers),
    data: response.data,
    config: {
      url: response.config.url,
      method: response.config.method,
      headers: maskHeaders(response.config.headers),
      data: response.config.data,
    },
  };
}

export function log(obj: any) {
  console.log(JSON.stringify(obj));
}

export function maskHeaders(headers) {
  const newHeaders = {...headers};
  const sensitiveKeys = ['authorization', 'set-cookie', 'cookie'];
  Object.keys(newHeaders).forEach(header => {
    const casedHeader = header.toLowerCase();
    if (sensitiveKeys.includes(casedHeader)) {
      newHeaders[header] = '*****';
    }
  });
  return newHeaders;
}

type NotificationPatternMapped = {
  id: string,
  beneficiaryId: string,
  sender: string,
  createdAt: string,
  content?: string
};
export function mapNotification(doc: any): NotificationPatternMapped {
  const n: NotificationPatternMapped = {
    id: String(doc._id),
    beneficiaryId: doc.beneficiaryId,
    sender: doc.sender,
    createdAt: doc.createdAt,
  };
  if (doc.content) n.content = doc.content;
  return n;
}
