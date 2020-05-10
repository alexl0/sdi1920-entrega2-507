module.exports = {
    app: null,
    log: null,
    init: function (app, log) {
        this.app = app;
        this.log = log;
    },
    appLog: function (mensaje) {
        this.log.info("App: " + mensaje);
    },
    logIn: function (usuario) {
        this.appLog(usuario + ": autenticado");
    },
    signUp: function (usuario) {
        this.appLog(usuario + ": registrado");
    },
    verUsuarios: function (usuario) {
        this.appLog(usuario + ": listar usuarios");
    },
    desconectarse: function (usuario) {
        this.appLog(usuario + ": desconectado");
    },
    verInvitaciones: function (usuario) {
        this.appLog(usuario + ": listar invitaciones");
    },
    verAmigos: function (usuario) {
        this.appLog(usuario + ": listar amigos");
    },
    aceptarInvitacion: function (usuarioFrom, usuarioTo) {
        this.appLog(usuarioTo + " acepta a " + usuarioFrom);
    },
    enviarInvitacion: function (usuarioFrom, usuarioTo) {
        this.appLog(usuarioFrom + " invita a " + usuarioTo);
    },
    error: function (error) {
        this.log.warn(error);
    }
};


