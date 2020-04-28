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
                res.redirect("/verUsuarios");
            }
        });
    });

    app.get('/desconectarse', function (req, res) {
        req.session.usuario = null;
        res.send("Usuario desconectado");
    });

    app.get("/verUsuarios", function (req, res) {
        let criterio = {};
        if (req.query.busqueda != null) {
            criterio = {
                $or: [
                    {
                        "email": {
                            $regex: ".*" + req.query.busqueda + ".*"
                        }
                    },
                    {
                        "name": {
                            $regex: ".*" + req.query.busqueda + ".*"
                        }
                    },
                    {
                        "lastname": {
                            $regex: ".*" + req.query.busqueda + ".*"
                        }
                    }
                ]
            };
        }
        let pg = parseInt(req.query.pg); // Es String !!!
        if (req.query.pg == null) { // Puede no venir el param
            pg = 1;
        }
        gestorBD.obtenerUsuariosPg(criterio, pg, req.session.usuario, function (usuarios, total) {
            if (usuarios == null) {
                res.send("Error al listar ");
            } else {
                let ultimaPg = total / 4;
                if (total % 4 > 0) { // Sobran decimales
                    ultimaPg = ultimaPg + 1;
                }
                let paginas = []; // paginas mostrar
                for (let i = pg - 2; i <= pg + 2; i++) {
                    if (i > 0 && i <= ultimaPg) {
                        paginas.push(i);
                    }
                }

                //Personas con las que hay invitaciones pendientes
                //(para no mostrar boton de agregar)
                let criterio2 = {$or: [{usuarioTo: req.session.usuario}, {usuarioFrom: req.session.usuario}]};
                gestorBD.obtenerInvitaciones(criterio2, function (invitaciones) {
                    if (invitaciones == null) {
                        res.send("Error al listar ");
                    } else {
                        //Personas con las que ya se es amigo
                        //(para no mostrar boton de agregar)
                        gestorBD.obtenerAmigos(req.session.usuario, function (amigos) {
                            if (amigos == null) {
                                res.send("Error al listar");
                            } else {
                                for (i=0;i<usuarios.length;i++) {
                                    //Es amigo o esta en proceso de serlo
                                    let esAmigo = "false";
                                    for (j=0;j<amigos.length;j++)
                                        if (amigos[j].email1 === usuarios[i].email || amigos[j].email2 === usuarios[i].email)
                                            esAmigo = "true";
                                    for (k=0;k<invitaciones.length;k++)
                                        if (invitaciones[k].usuarioFrom === usuarios[i].email || invitaciones[k].usuarioTo === usuarios[i].email)
                                            esAmigo = "true";
                                    usuarios[i].esAmigo = esAmigo;
                                }
                                let respuesta = swig.renderFile('views/busuarios.html', {
                                    usuarios: usuarios,
                                    paginas: paginas,
                                    actual: pg
                                });
                                res.send(respuesta);
                            }
                        });
                    }
                });
            }
        });
    });

    app.get("/invitaciones", function (req, res) {
        let criterio = {usuarioTo: req.session.usuario};
        gestorBD.obtenerInvitaciones(criterio, function (invitaciones) {
            if (invitaciones == null) {
                res.send("Error al listar ");
            } else {
                let respuesta = swig.renderFile('views/binvitaciones.html',
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
                    res.redirect("/verUsuarios?mensaje=Error al enviar la invitación&tipoMensaje=alert-danger");
                else
                    res.redirect("/verUsuarios?mensaje=Invitación enviada correctamente&tipoMensaje=alert-success");
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

    app.get('/amigos', function (req, res) {
        gestorBD.obtenerAmigos(req.session.usuario, function (amigos) {
            if (amigos == null) {
                res.send("Error al listar");
            } else {
                let respuesta = swig.renderFile('views/bamigos.html',
                    {
                        amigos: amigos,
                        usuario: req.session.usuario
                    });
                res.send(respuesta);
            }
        });
    });

};