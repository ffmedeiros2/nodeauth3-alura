const Usuario = require('./usuarios-modelo');

const { InvalidArgumentError, NaoEncontrado } = require('../erros');

const { ConversorUsuario } = require('../conversores');

const tokens = require('./tokens');
const { EmailVerificacao, EmailRedefinicaoSenha } = require('./emails');

function geraEndereco(rota, token) {
    const baseURL = process.env.BASE_URL;
    return `${baseURL}${rota}${token}`;
}

module.exports = {
    async adiciona(req, res, next) {
        const { nome, email, senha, cargo } = req.body;

        try {
            const usuario = new Usuario({
                nome,
                email,
                emailVerificado: false,
                cargo,
            });
            await usuario.adicionaSenha(senha);
            await usuario.adiciona();

            const token = tokens.verificacaoEmail.cria(usuario.id);
            const endereco = geraEndereco('/usuario/verifica-email/', token);
            const emailVerificacao = new EmailVerificacao(usuario, endereco);
            emailVerificacao.enviaEmail().catch(console.log);

            res.status(201).json();
        } catch (erro) {
            next(erro);
        }
    },

    async login(req, res, next) {
        try {
            const accessToken = tokens.access.cria(req.user.id);
            const refreshToken = await tokens.refresh.cria(req.user.id);
            res.set('Authorization', accessToken);
            res.status(200).json({ refreshToken });
        } catch (erro) {
            next(erro);
        }
    },

    async logout(req, res, next) {
        try {
            const token = req.token;
            await tokens.access.invalida(token);
            res.status(204).json();
        } catch (erro) {
            next(erro);
        }
    },

    async lista(req, res, next) {
        try {
            const usuarios = await Usuario.lista();
            const atributos = req.acesso.todos.permitido
                ? req.acesso.todos.atributos
                : req.acesso.apenasSeu.atributos;
            const conversor = new ConversorUsuario('json', atributos);

            res.send(conversor.converter(usuarios));
        } catch (erro) {
            next(erro);
        }
    },

    async verificaEmail(req, res, next) {
        try {
            const usuario = req.user;
            await usuario.verificaEmail();
            res.status(200).json();
        } catch (erro) {
            next(erro);
        }
    },

    async deleta(req, res, next) {
        try {
            const usuario = await Usuario.buscaPorId(req.params.id);
            await usuario.deleta();
            res.status(200).json();
        } catch (erro) {
            next(erro);
        }
    },

    async esqueciMinhaSenha(req, res, next) {
        const respostaPadrao = {
            mensagem:
                'Se encontramos encontrarmos um usuário com este e-mail vamos enviar uma mensagem com as instruções para redefinir a senha',
        };
        try {
            const email = req.body.email;
            const usuario = await Usuario.buscaPorEmail(email);
            const token = await tokens.redefinicaoDeSenha.criarToken(
                usuario.id
            );
            const emailRedefinicao = new EmailRedefinicaoSenha(usuario, token);
            await emailRedefinicao.enviaEmail();

            res.status(200).send(respostaPadrao);
        } catch (erro) {
            if (error instanceof NaoEncontrado) {
                res.status(200).send(respostaPadrao);
                return;
            }
            next(erro);
        }
    },

    async trocarSenha(req, res, next) {
        try {
            const { token, senha } = req.body;
            if (typeof token === 'string' && token.length === 0) {
                throw new InvalidArgumentError('O token está inválido');
            }

            const id = await tokens.redefinicaoDeSenha.verifica(token);
            const usuario = await Usuario.buscaPorId(id);
            await usuario.adicionaSenha(senha);
            await usuario.atualizaSenha();
            res.send({ mensagem: 'Sua senha foi atualizada com sucesso' });
        } catch (erro) {
            next(erro);
        }
    },
};
