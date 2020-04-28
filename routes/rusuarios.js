module.exports = function (app, swig, gestorBD) {

    app.get("/registrarse", function (req, res) {
        let respuesta = swig.renderFile('views/bregistro.html', {});
        res.send(respuesta);
    });

    app.post('/registrarse', function (req, res) {
        //password
        let seguro = app.get("crypto").createHmac('sha256', app.get('clave'))
            .update(req.body.password).digest('hex');
        //repeat password
        let seguro2 = app.get("crypto").createHmac('sha256', app.get('clave'))
            .update(req.body.repeatPassword).digest('hex');
        let usuario = {
            email: req.body.email,
            name: req.body.name,
            lastname: req.body.lastname,
            password: seguro,
            repeatPassword: seguro2
        }
        //Si las contraseñas coinciden
        if (usuario.password != usuario.repeatPassword)
            res.redirect("/registrarse?mensaje=Las contraseñas no coinciden");
        else {
            //Si el email no existe en base de datos ya
            criterio = {"email": usuario.email};
            gestorBD.obtenerUsuarios(criterio, function (usuariobd) {
                if (usuariobd.length == 0)
                    gestorBD.insertarUsuario(usuario, function (id) {
                        if (id == null) {
                            res.redirect("/registrarse?mensaje=Error al registrar usuario");
                        } else {
                            res.redirect("/identificarse?mensaje=Nuevo usuario registrado");
                        }
                    });
                else
                    res.redirect("/registrarse?mensaje=Este email ya está registrado");
            });
        }
    });

    app.get("/identificarse", function (req, res) {
        let respuesta = swig.renderFile('views/bidentificacion.html', {});
        res.send(respuesta);
    });

    app.post("/identificarse", function (req, res) {
        let seguro = app.get("crypto").createHmac('sha256', app.get('clave'))
            .update(req.body.password).digest('hex');
        let criterio = {
            email: req.body.email,
            password: seguro
        }
        gestorBD.obtenerUsuarios(criterio, function (usuarios) {
            if (usuarios == null || usuarios.length == 0) {
                req.session.usuario = null;
                res.redirect("/identificarse" + "?mensaje=Email o password incorrecto" + "&tipoMensaje=alert-danger ");
            } else {
                req.session.usuario = usuarios[0].email;
                res.redirect("/tienda");
            }
        });
    });

    app.get('/desconectarse', function (req, res) {
        req.session.usuario = null;
        res.send("Usuario desconectado");
    });

    app.get("/invitaciones", function (req, res) {
        let criterio = {usuarioTo: req.session.usuario};
        gestorBD.obtenerInvitaciones(criterio, function (invitaciones) {
            if (invitaciones == null) {
                res.send("Error al listar ");
            } else {
                let respuesta = swig.renderFile('views/bpublicaciones.html',
                    {
                        invitaciones: invitaciones
                    });
                res.send(respuesta);
            }
        });
    });

    app.get("/usuario/invitar/:email", function (req, res) {
        if (req.session.usuario && req.session.usuario === req.params.email) {
            res.redirect("/identificarse" + "?mensaje=No se puede enviar una invitación de amistad a ti mismo" + "&tipoMensaje=alert-danger ");
        } else {
            gestorBD.insertarInvitacion(req.session.usuario, req.params.email, function (idInvitacion) {
                if (idInvitacion == null)
                    res.redirect("/tienda?mensaje=Error al enviar la invitación&tipoMensaje=alert-danger");
                else
                    res.redirect("/tienda?mensaje=Invitación enviada correctamente&tipoMensaje=alert-success");
            });
        }
    });

    app.get("/usuario/aceptar/:email", function (req, res) {
        if (req.session.usuario && req.session.usuario === req.params.email) {
            //Este caso es imposible que se de, ya que en la lista de usuarios no aparece el usuario mismo,
            //pero aun asi lo compruebo
            res.redirect("/invitaciones" + "?mensaje=No te puedes agregar a ti mismo" + "&tipoMensaje=alert-danger ");
        } else {
            gestorBD.insertarAmigos(req.session.usuario, req.params.email, function (idInvitacion) {
                if (idInvitacion == null)
                    res.redirect("/invitaciones?mensaje=Error al aceptar la invitación&tipoMensaje=alert-danger");
                else {
                    let criterio2 = {
                        $or: [
                            {
                                $and: [
                                    {"usuarioFrom": req.session.usuario},
                                    {"usuarioTo": req.params.email}
                                ]
                            },
                            {
                                $and: [
                                    {"usuarioTo": req.session.usuario},
                                    {"usuarioFrom": req.params.email}
                                ]
                            }
                        ]
                    };
                    gestorBD.eliminarInvitacion(criterio2, function (invitaciones) {
                        if (invitaciones == null) {
                            res.send(respuesta);
                        } else {
                            res.redirect("/invitaciones?mensaje=Invitación aceptada correctamente&tipoMensaje=alert-success");
                        }
                    });
                }
            });
        }
    });

};