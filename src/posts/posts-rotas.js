const postsControlador = require('./posts-controlador');

const tentarAutorizar = require('../middlewares/tentar-autorizar');

const tentarAutenticar = require('../middlewares/tentar-autenticar');

const autorizacao = require('../middlewares/autorizacao');

const { middlewaresAutenticacao } = require('../usuarios');

module.exports = (app) => {
    app.route('/post')
        .get(
            [tentarAutenticar, tentarAutorizar('post', 'ler')],
            postsControlador.lista
        )
        .post(
            [middlewaresAutenticacao.bearer, autorizacao('post', 'criar')],
            postsControlador.adiciona
        );

    app.route('/post/:id')
        .get(
            [middlewaresAutenticacao.bearer, autorizacao('post', 'ler')],
            postsControlador.obterDetalhes
        )
        .delete(
            [
                middlewaresAutenticacao.bearer,
                middlewaresAutenticacao.local,
                autorizacao('post', 'remover'),
            ],
            postsControlador.remover
        );
};
