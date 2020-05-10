module.exports = function (app, gestorBD) {

    /**
     * Log donde se almacena un listado de las acciones desencadenadas
     * por el usuario en sesión
     */
    var gestorLogApi = app.get('gestorLogApi');

    /**
     * Obtiene la lista de amigos para mostrar en la vista
     * correspondiente
     */
    app.get("/api/amigos", function (req, res) {
        gestorBD.obtenerAmigos(res.usuario, function (amigos) {
            if (amigos == null) {
                res.status(500);
                res.json({
                    error: "se ha producido un error"
                })
            } else {
                res.status(200);
                res.send(JSON.stringify(amigos));
                gestorLogApi.amigosCliente(res.usuario);
            }
        });
    });

    /**
     * Obtiene la lista de usuarios con el objetivo de averiguar el nombre
     * y apellidos de un usuario con un determinado email, ya que los
     * campos nombre y apellido no se detectan en la base de datos
     */
    app.get("/api/usuarios", function (req, res) {
        gestorBD.obtenerUsuarios({}, function (usuarios) {
            if (usuarios == null) {
                res.status(500);
                res.json({
                    error: "se ha producido un error"
                })
            } else {
                res.status(200);
                res.send(JSON.stringify(usuarios));
            }
        });
    });

    /**
     * Guarda el token de autenticacion del usuario
     */
    app.post("/api/autenticar/", function (req, res) {
        let seguro = app.get("crypto").createHmac('sha256', app.get('clave'))
            .update(req.body.password).digest('hex');

        let criterio = {
            email: req.body.email,
            password: seguro
        }

        gestorBD.obtenerUsuarios(criterio, function (usuarios) {
            if (usuarios == null || usuarios.length == 0) {
                res.status(401);
                res.json({
                    autentificado: false
                })
            } else {
                var token = app.get('jwt').sign(
                    {usuario: criterio.email, tiempo: Date.now() / 1000},
                    "secreto");
                res.status(200);
                res.json({
                    autentificado: true,
                    token: token
                })
                gestorLogApi.logInCliente(criterio.email);
            }
        });
    });

    /**
     * Añade un mensaje a la base de datos
     *  usuarioFrom: usuario que envia el mensaje
     *      (usuario en sesión)
     *  usuarioTo: usuario receptor
     *      (usuario con el que se está chateando)
     *  se realizan una serie de comprobaciones en los
     *  siguientes pasos
     */
    app.post("/api/mensaje/", function (req, res) {

        //Conseguir usuario en sesión (no, no vale con res.usuario por una razón desconocida)
        //var ussuariosesion=res.usuario;
        cadena = req.headers.cookie.split("loggedUserEmail=");
        cadena2 = cadena[1].split(";");
        usuarioEnSesionEmail = cadena2[0];

        var mensaje = {
            usuarioFrom: usuarioEnSesionEmail, // el emisor es el usuario en sesión
            usuarioTo: req.body.usuarioTo,
            contenido: req.body.contenido,
            leido: false, // por defecto se crea como no leido
        };

        if (mensaje.usuarioTo == null || mensaje.usuarioFrom == null || mensaje.contenido == null || mensaje.usuarioFrom == null) {
            res.status(500);
            res.json({
                error: "Se ha producido un error: un mensaje debe contener obligatoriamente emisor, receptor y texto."
            })
        } else if (mensaje.contenido.length > 400) {
            res.status(500);
            res.json({
                error: "Se ha producido un error: un mensaje debe contener obligatoriamente menos de 400 caracteres."
            })
        } else {
            enviarMensajePaso1(req, res, mensaje);
        }

    });

    /**
     * Comprobar que existe usuarioTo
     * @param req
     * @param res
     * @param mensaje
     */
    function enviarMensajePaso1(req, res, mensaje) {
        var criterio = {"email": mensaje.usuarioTo};
        gestorBD.obtenerUsuarios(criterio, function (usuarioTo) {
            if (usuarioTo == null) {
                res.status(500);
                res.json({
                    error: "Se ha producido un error al insertar un mensaje. Usuario destino no existe."
                })
            } else {
                enviarMensajePaso2(req, res, mensaje);
            }
        });
    }

    /**
     * Comprobar que son amigos
     * @param req
     * @param res
     * @param mensaje
     */
    function enviarMensajePaso2(req, res, mensaje) {
        gestorBD.comprobarSiSonAmigos(mensaje.usuarioTo, mensaje.usuarioFrom, function (yaSonAmigos) {
            if (!yaSonAmigos) {
                res.status(500);
                res.json({
                    error: "Se ha producido un error al insertar un mensaje. " +
                        "usuarioFrom y usuarioTo no son amigos."
                })
            } else
                enviarMensajePaso3(req, res, mensaje);
        });
    }

    /**
     * Se inserta el mensaje y se añade el tiempo a amigos
     * para saber cuanto tiempo ha pasado desde la ultima vez que
     * se hablo con ese amigo.
     * @param req
     * @param res
     * @param mensaje
     */
    function enviarMensajePaso3(req, res, mensaje) {
        /**
         * Se inserta el mensaje en la base de datos
         */
        gestorBD.insertarMensaje(mensaje, function (id) {
            if (id == null) {
                res.send("Error al enviar mensaje");
            } else {
                let criterio2 = {
                    $or: [
                        {
                            $and: [
                                {"email1": mensaje.usuarioFrom},
                                {"email2": mensaje.usuarioTo}
                            ]
                        },
                        {
                            $and: [
                                {"email1": mensaje.usuarioTo},
                                {"email2": mensaje.usuarioFrom}
                            ]
                        }
                    ]
                };
                /**
                 * Se añade a la relaccion de amistad entre los dos usuarios
                 * el ultimo momento en el que ha habido un mensaje entrante
                 * o saliente, con el objetivo de poder ordenar la tabla
                 * de amigos en orden de ultimo mensaje.
                 */
                gestorBD.modificarAmigos(criterio2, function (result) {
                    if (result == null) {
                        res.status(500);
                        res.json({
                            error: "Se ha producido un error"
                        })
                    } else {
                        res.status(200);
                        res.json({
                            mensaje: "Mensaje enviado con éxito.",
                            _id: id
                        });
                    }
                });
                gestorLogApi.enviarMensaje(mensaje.usuarioFrom, mensaje.usuarioTo, mensaje.contenido);
            }
        });
    }

    /**
     * Obtiene los mensajes para poder listarlos en el chat
     * No se utiliza paginacion ya que el chat es un scroll
     * simulando cualquier aplicacion de mensajes como
     * whatsapp o telegram.
     */
    app.get("/api/mensaje", function (req, res) {

        //Obtener usuario en sesión de las cookies
        cadena = req.headers.cookie.split("loggedUserEmail=");
        cadena2 = cadena[1].split(";");
        usuarioEnSesionEmail = cadena2[0];

        /**
         * Comprobar que existe usuarioTo
         */
        var criterio = {"email": req.query.usuario};
        gestorBD.obtenerUsuarios(criterio, function (usuarioTo) {
            if (usuarioTo == null) {
                res.status(500);
                res.json({
                    error: "Se ha producido un error al insertar un mensaje. Usuario destino no existe."
                })
            } else {
                /**
                 * Recibir los mensajes
                 */
                var criterio = {
                    $or: [{"usuarioTo": usuarioEnSesionEmail, "usuarioFrom": req.query.usuario},
                        {"usuarioTo": req.query.usuario, "usuarioFrom": usuarioEnSesionEmail}]
                };
                gestorBD.obtenerMensajes(criterio, function (mensajes) {
                    if (mensajes == null) {
                        res.status(500);
                        res.json({
                            error: "se ha producido un error"
                        })
                    } else {
                        res.status(200);
                        res.send(JSON.stringify(mensajes));
                    }
                });
                gestorLogApi.obtenerMensajesCliente(usuarioEnSesionEmail, req.query.usuario);
            }
        });


    });

    /**
     * Obtiene todos los mensajes en los que aparezca el usuario en sesión
     * como receptor
     */
    app.get("/api/mensaje/todos", function (req, res) {

        //Obtener usuario en sesión de las cookies
        cadena = req.headers.cookie.split("loggedUserEmail=");
        cadena2 = cadena[1].split(";");
        usuarioEnSesionEmail = cadena2[0];

        var criterio = {"usuarioTo": usuarioEnSesionEmail};
        gestorBD.obtenerMensajes(criterio, function (mensajes) {
            if (mensajes == null) {
                res.status(500);
                res.json({
                    error: "se ha producido un error"
                })
            } else {
                res.status(200);
                res.send(JSON.stringify(mensajes));
            }
        });
    });

    /**
     * Modifica un mensaje.
     * Se utiliza para marcarlo como leido.
     * Se marca como leido automaticamente cuando el usuario
     * correspondiente entra en el chat.
     */
    app.put("/api/mensaje", function (req, res) {

        //Conseguir usuario en sesión (no, no vale con res.usuario por una razón desconocida)
        //var ussuariosesion=res.usuario;
        cadena = req.headers.cookie.split("loggedUserEmail=");
        cadena2 = cadena[1].split(";");
        usuarioEnSesionEmail = cadena2[0];

        let criterio = {
            $and: [
                {"usuarioTo": usuarioEnSesionEmail},
                {"usuarioFrom": req.body.usuarioFrom},
            ]
        };

        let mensaje = {"leido": true}; // Solo los atributos a modificar

        gestorBD.modificarMensajeMarcarLeido(criterio, mensaje, function (result) {
            if (result == null) {
                res.status(500);
                res.json({
                    error: "Se ha producido un error al marcar un mensaje como leido"
                });
            } else {
                res.status(200);
                res.json({
                    mensaje: "Mensajes recibidos marcados como leidos",
                    _id: req.params.id,
                    nModified: result.result.nModified
                });
                gestorLogApi.leer(usuarioEnSesionEmail, req.body.usuarioFrom);
            }
        });
    });

}