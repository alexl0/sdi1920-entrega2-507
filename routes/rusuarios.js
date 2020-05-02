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
        res.redirect("/identificarse?mensaje=Se ha desconectado con éxito.");
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
                let ultimaPg = total / 5;
                if (total % 5 > 0) { // Sobran decimales
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
                                for (i = 0; i < usuarios.length; i++) {
                                    //Es amigo o esta en proceso de serlo
                                    let esAmigo = "false";
                                    for (j = 0; j < amigos.length; j++)
                                        if (amigos[j].email1 === usuarios[i].email || amigos[j].email2 === usuarios[i].email)
                                            esAmigo = "true";
                                    for (k = 0; k < invitaciones.length; k++)
                                        if (invitaciones[k].usuarioFrom === usuarios[i].email || invitaciones[k].usuarioTo === usuarios[i].email)
                                            esAmigo = "true";
                                    usuarios[i].esAmigo = esAmigo;
                                }
                                let respuesta = swig.renderFile('views/busuarios.html', {
                                    usuarios: usuarios,
                                    paginas: paginas,
                                    actual: pg,
                                    email: req.session.usuario
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
        let pg = parseInt(req.query.pg); // Es String !!!
        if (req.query.pg == null) { // Puede no venir el param
            pg = 1;
        }
        gestorBD.obtenerInvitacionesPg(criterio, pg, function (invitaciones, total) {
            if (invitaciones == null) {
                res.send("Error al listar ");
            } else {
                let ultimaPg = total / 5;
                if (total % 5 > 0) { // Sobran decimales
                    ultimaPg = ultimaPg + 1;
                }
                let paginas = []; // paginas mostrar
                for (let i = pg - 2; i <= pg + 2; i++) {
                    if (i > 0 && i <= ultimaPg) {
                        paginas.push(i);
                    }
                }
                let respuesta = swig.renderFile('views/binvitaciones.html',
                    {
                        invitaciones: invitaciones,
                        email: req.session.usuario,
                        paginas: paginas,
                        actual: pg
                    });
                res.send(respuesta);
            }
        });
    });

    app.get("/usuario/invitar/:email", function (req, res) {
        /**
         * Voy a hacer una serie de comprobaciones basicamente para que no se pueda meter la url en el navegador
         * por ejemplo https://localhost:8081/usuario/invitar/:email
         *      que ya sea amigo
         *      que sea tu propio email
         *      que no exista ese email en la base de datos
         *      no estas logueado
         */
        //No estas logueado
        if (req.session.usuario == null)
            res.redirect("/identificarse?mensaje=Debe identificarse primero");
        else {
            if (req.session.usuario && req.session.usuario === req.params.email)
                //Usuario no se puede agregar a si mismo
                res.redirect("/invitaciones" + "?mensaje=No se puede agregar a si mismo" + "&tipoMensaje=alert-danger ");
            else {
                //Usuario que se quiere agregar no existe
                criterio = {"email": req.params.email};
                gestorBD.obtenerUsuarios(criterio, function (usuariobd) {
                    if (usuariobd.length == 0)
                        res.redirect("/invitaciones" + "?mensaje=No existe el usuario que se desea agregar" + "&tipoMensaje=alert-danger ");
                    else {
                        //Si ya son amigos, no se vuelve a añadir a la base de datos.
                        //(No es posible que se de este caso porque se comprueba para enviar una petición si ya
                        //es amigo, y como antes se ha comprobado que no tenga peticiones, pues es imposible)
                        gestorBD.comprobarSiSonAmigos(req.session.usuario, req.params.email, function (yaSonAmigos) {
                            if (yaSonAmigos)
                                res.redirect("/invitaciones" + "?mensaje=Ya es amigo de esa persona" + "&tipoMensaje=alert-danger ");
                            else
                                gestorBD.comprobarSiHayInvitaciones(req.session.usuario, req.params.email, function (yaSonAmigos) {
                                    if (yaSonAmigos)
                                        res.redirect("/invitaciones" + "?mensaje=Hay invitaciones pendientes entre usted y esa persona" + "&tipoMensaje=alert-danger ");
                                    else
                                        gestorBD.insertarInvitacion(req.session.usuario, req.params.email, function (idInvitacion) {
                                            if (idInvitacion == null)
                                                res.redirect("/verUsuarios?mensaje=Error al enviar la invitación&tipoMensaje=alert-danger");
                                            else
                                                res.redirect("/verUsuarios?mensaje=Invitación enviada correctamente&tipoMensaje=alert-success");
                                        });
                                });
                        });
                    }
                });
            }
        }
    });

    app.get("/usuario/aceptar/:email", function (req, res) {
        /**
         * Voy a hacer una serie de comprobaciones basicamente para que no se pueda meter la url en el navegador
         * por ejemplo https://localhost:8081/usuario/aceptar/:email
         *      de un email que no te haya mandado la invitación,
         *      que ya sea amigo
         *      que sea tu propio email
         *      que no exista ese email en la base de datos
         *      no estas logueado
         */
        if (req.session.usuario == null)
            res.redirect("/identificarse?mensaje=Debe identificarse primero");
        else {
            if (req.session.usuario && req.session.usuario === req.params.email)
                //Usuario no se puede agregar a si mismo
                res.redirect("/invitaciones" + "?mensaje=No se puede agregar a si mismo" + "&tipoMensaje=alert-danger ");
            else {
                //Usuario que se quiere agregar no existe
                criterio = {"email": req.params.email};
                gestorBD.obtenerUsuarios(criterio, function (usuariobd) {
                    if (usuariobd.length == 0)
                        res.redirect("/invitaciones" + "?mensaje=No existe el usuario que se desea agregar" + "&tipoMensaje=alert-danger ");
                    else {
                        //Si no tiene una invitacion, no se puede aceptar la invitacion
                        let criterio2 = {$and: [{usuarioTo: req.session.usuario}, {usuarioFrom: req.params.email}]};
                        gestorBD.obtenerInvitaciones(criterio2, function (invitaciones) {
                            if (invitaciones.length == 0)
                                res.redirect("/invitaciones" + "?mensaje=No tiene una invitación de esa persona" + "&tipoMensaje=alert-danger ");
                            else {
                                //Si ya son amigos, no se vuelve a añadir a la base de datos.
                                //(No es posible que se de este caso porque se comprueba para enviar una petición si ya
                                //es amigo, y como antes se ha comprobado que no tenga peticiones, pues es imposible)
                                gestorBD.comprobarSiSonAmigos(req.session.usuario, req.params.email, function (yaSonAmigos) {
                                    if (yaSonAmigos)
                                        res.redirect("/invitaciones" + "?mensaje=Ya es amigo de esa persona" + "&tipoMensaje=alert-danger ");
                                    else
                                        //Se añaden los amigos a la base de datos
                                        gestorBD.insertarAmigos(req.session.usuario, req.params.email, function (idInvitacion) {
                                            if (idInvitacion == null)
                                                res.redirect("/invitaciones?mensaje=Error al aceptar la invitación&tipoMensaje=alert-danger");
                                            else {
                                                let criterio3 = {
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
                                                //Y se borra la invitación
                                                gestorBD.eliminarInvitacion(criterio3, function (invitaciones) {
                                                    if (invitaciones == null) {
                                                        res.send(respuesta);
                                                    } else {
                                                        res.redirect("/invitaciones?mensaje=Invitación aceptada correctamente&tipoMensaje=alert-success");
                                                    }
                                                });
                                            }
                                        });
                                });
                            }
                        });
                    }
                });
            }
        }
    });

    app.get('/amigos', function (req, res) {
        let pg = parseInt(req.query.pg); // Es String !!!
        if (req.query.pg == null) { // Puede no venir el param
            pg = 1;
        }
        gestorBD.obtenerAmigosPg(req.session.usuario, pg, function (amigos, total) {
            if (amigos == null) {
                res.send("Error al listar");
            } else {
                let ultimaPg = total / 5;
                if (total % 5 > 0) { // Sobran decimales
                    ultimaPg = ultimaPg + 1;
                }
                let paginas = []; // paginas mostrar
                for (let i = pg - 2; i <= pg + 2; i++) {
                    if (i > 0 && i <= ultimaPg) {
                        paginas.push(i);
                    }
                }
                let respuesta = swig.renderFile('views/bamigos.html',
                    {
                        amigos: amigos,
                        email: req.session.usuario,
                        paginas: paginas,
                        actual: pg
                    });
                res.send(respuesta);
            }
        });
    });

    //#####################################################################
    //########################## ATENCIÓN #################################
    //#####################################################################
    //En una aplicación comercial no se haría esto bajo ninguna
    //circunstancia. Solo tiene la intención de facilitar la
    //ejecución de los test.
    app.get('/borrarUsuarios', function (req, res) {
        gestorBD.eliminarUsuarios(function (result) {
            if (result == null) {
                console.log("Error al borrar usuarios");
            } else {
                gestorBD.eliminarInvitaciones(function (result) {
                    if (result == null) {
                        console.log("Error al borrar invitaciones");
                    } else {
                        gestorBD.eliminarAmigos(function (result) {
                            if (result == null) {
                                console.log("Error al borrar amigos");
                            } else {
                                let respuesta = swig.renderFile('views/bregistro.html', {});
                                res.send(respuesta);
                            }
                        });
                    }
                });
            }
        });
    });

};