const clients = new Map();

export const addRealtimeClient = (userId, res) => {
  const key = userId.toString();
  if (!clients.has(key)) clients.set(key, new Set());
  clients.get(key).add(res);

  res.on('close', () => {
    clients.get(key)?.delete(res);
    if (clients.get(key)?.size === 0) clients.delete(key);
  });
};

export const sendToUser = (userId, event, data = {}) => {
  const key = userId?.toString();
  if (!key || !clients.has(key)) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.get(key).forEach((res) => res.write(payload));
};

export const broadcastToUsers = (userIds = [], event, data = {}) => {
  userIds.forEach((userId) => sendToUser(userId, event, data));
};

export const sendDashboardUpdate = (userIds = [], scope = 'dashboard') => {
  broadcastToUsers(userIds, 'dashboard:update', { scope, at: new Date().toISOString() });
};
