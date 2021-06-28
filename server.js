require('dotenv').config();

const app = require('./app');
const port = 3000;
require('./database');
require('./redis/blocklist-access-token');
require('./redis/allowlist-refresh-token');
const {
    InvalidArgumentError,
    NaoEncontrado,
    NaoAutorizado,
} = require('./src/erros');
const { ConversorErro } = require('./src/conversores');

const jwt = require('jsonwebtoken');

app.use((req, res, next) => {
    const formatoRequisitado = req.header('Accept');

    if (
        formatoRequisitado !== 'application/json' &&
        formatoRequisitado !== '*/*'
    ) {
        res.status(406);
        res.end();
        return;
    }

    res.set({
        'Content-Type': 'application/json',
    });

    next();
});

const routes = require('./rotas');
routes(app);

app.use((erro, req, res, next) => {
    const conversor = new ConversorErro();
    let corpo = { mensagem: erro.message };

    switch (erro.constructor) {
        case InvalidArgumentError:
            res.status(400);
            break;
        case NaoEncontrado:
            res.status(404);
            break;
        case jwt.TokenExpiredError:
            corpo.expiradoEm = erro.expiredAt;
        case jwt.JsonWebTokenError:
        case NaoAutorizado:
            res.status(401);
            break;
        default:
            res.status(500);
    }

    res.send(conversor.converter(corpo));
});

app.listen(port, () => console.log('A API está funcionando!'));
