module.exports = {
    app: null,
    log: null,
    init: function (app, log) {
        this.app = app;
        this.log = log;
    },
    clienteLog: function (mensaje) {
        this.log.info("Cliente: " + mensaje);
    },
    amigosCliente: function (usuario) {
        this.clienteLog(usuario + ": lista de amigos ");
    },
    logInCliente: function (usuario) {
        this.clienteLog(usuario + ": autenticado");
    },
    leer: function (userLoggedIn, userChattingWith) {
        this.clienteLog(userLoggedIn + " ha leido los mensajes de: " + userChattingWith);
    },
    obtenerMensajesCliente: function (userLoggedIn, userChattingWith) {
        this.clienteLog(userLoggedIn + " accede al chat con " + userChattingWith);
    },
    enviarMensaje: function (usuarioFrom, usuarioTo, content) {
        this.clienteLog(usuarioFrom + " envia mensaje a: " + usuarioTo + ". Contenido: " + content);
    }
};


