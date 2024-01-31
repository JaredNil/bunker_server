import { WebSocketServer } from 'ws';
import { v4 as uuid } from 'uuid';
// import { createServer } from 'https';
// import { readFileSync } from 'fs';
// подключенные клиенты
const clients = {};

// WebSocket-сервер на порту 8001
const wss = new WebSocketServer({ port: 8001 });
console.log('Server started');

wss.on('connection', function (ws) {
	const id = uuid();

	clients[id] = ws;

	console.log('New connect ' + id);

	ws.on('message', function (message) {
		console.log('получено сообщение ' + message);

		// for (var key in clients) {
		// 	clients[key].send(message);
		// }
	});

	ws.on('close', function () {
		console.log('соединение закрыто ' + id);
		delete clients[id];
	});
});
