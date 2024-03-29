import ws, { WebSocketServer } from 'ws';
import { v4 as uuid } from 'uuid';
import express from 'express';
import { createServer } from 'http';

const app = express();
const server = createServer(app);

const PORT = 8001 || process.env.PORT;

function initWs() {
	const options = {
		noServer: true,
	};

	return new WebSocketServer(options);
}

function initHttpServer(PORT) {
	app.get('/', (req, res) => {
		res.send('Giphy Chat Server is running successfully');
	});

	server.listen(PORT, () => {
		console.log(`Server is working on http://localhost:${PORT}`);
	});

	return app;
}

function initWebSocketServer(PORT = 8001) {
	initHttpServer(PORT);
	const wss = initWs();

	server.on('upgrade', async (req, socket, head) => {
		try {
			wss.handleUpgrade(req, socket, head, (ws) => {
				// Do something before firing the connected event

				wss.emit('connection', ws, req);
			});
		} catch (err) {
			// Socket uprade failed
			// Close socket and clean
			console.log('Socket upgrade failed', err);
			socket.destroy();
		}
	});

	return wss;
}
const wss = initWebSocketServer();

// wss.on('connection', (ws) => {
// 	ws.on('message', (data) => {
// 		ws.send(data);
// 	});
// });

// const app = express();

// const server = http.createServer(app);

const connection = {};

// const wss = new WebSocketServer({
// 	server,
// 	cors: {
// 		origin: '*',
// 		credentials: true,
// 		methods: ['GET', 'POST'],
// 	},
// });
console.log('Server started');

const getActualSessionList = () => {
	const actualClientsList = [];
	for (const connect in connection) {
		actualClientsList.push(connection[connect].nickname);
	}
	return actualClientsList;
};

const isNewClientConnection = (nickname, id) => {
	let isNew = true;
	const actualClientsList = getActualSessionList();

	actualClientsList.forEach((cl) => {
		if (cl === nickname) isNew = false;
	});
	console.log('          isNewClientConnection' + actualClientsList, nickname, isNew);

	return isNew;
};

const eventSwitchHandler = (message, ws, id) => {
	const { type, body } = JSON.parse(message);
	console.log(type, body, Boolean(ws), 'сообщение принято');

	switch (type) {
		case 'auth':
			// nickname = body NOTICE IS THIS CASE
			if (body) {
				if (isNewClientConnection(body, id)) {
					connection[id].isAuth = true;
					connection[id].nickname = body;
					ws.send(
						JSON.stringify({
							type: 'auth_res',
							status: 200,
							nickname: connection[
								id
							].nickname,
							clientList: getActualSessionList(),
						})
					);
				} else {
					ws.send(
						JSON.stringify({
							type: 'auth_err',
							status: 403,
							desc: 'The user is already authorization in this game right now.',
						})
					);
				}
			}

			// UPDATE FOR ALL - AUTH NEW AUTH_CLIENT
			Object.keys(connection).forEach((client, i) => {
				connection[client].ws.send(
					JSON.stringify({
						type: 'update_gameData',
						status: 200,
						nickname: client.nickname,
						clientList: getActualSessionList(),
					})
				);
			});

			break;
		case 'logout':
			const nickname = body;
			let logoutConnectId = null;

			for (const connect in connection) {
				if (connection[connect].nickname === nickname) {
					logoutConnectId = connect;
				}
			}
			if (logoutConnectId) {
				connection[logoutConnectId].isAuth = false;
				connection[logoutConnectId].nickname = null;
			}

			// UPDATE FOR ALL - LOGOUT NEW AUTH_CLIENT
			Object.keys(connection).forEach((client, i) => {
				connection[client].ws.send(
					JSON.stringify({
						type: 'update_gameData',
						status: 200,
						nickname: client.nickname,
						clientList: getActualSessionList(),
					})
				);
			});

			break;

		case 'update':
			// nickname = body NOTICE IS THIS CASE
			connection[id].isAuth = true;
			connection[id].nickname = body;
			ws.send(
				JSON.stringify({
					type: 'update_res',
					status: 200,
					nickname: connection[id].nickname,
					clientList: getActualSessionList(),
				})
			);

			Object.keys(connection).forEach((client, i) => {
				connection[client].ws.send(
					JSON.stringify({
						type: 'update_gameData',
						status: 200,
						nickname: client.nickname,
						clientList: getActualSessionList(),
					})
				);
			});

			break;

		default:
			console.log(body);
			break;
	}
};

wss.on('connection', function (ws) {
	const id = uuid();

	connection[id] = {
		isAuth: false,
		nickname: null,
		ws: ws,
	};

	console.log('New connect ' + id);

	ws.on('message', function (message) {
		eventSwitchHandler(String(message), ws, id);
	});

	ws.on('close', function () {
		console.log('соединение закрыто ' + id);
		delete connection[id];
	});
});
