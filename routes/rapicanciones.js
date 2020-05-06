module.exports = function (app, gestorBD) {

    app.get("/api/amigos", function (req, res) {
        gestorBD.obtenerAmigos(res.usuario, function (canciones) {
            if (canciones == null) {
                res.status(500);
                res.json({
                    error: "se ha producido un error"
                })
            } else {
                res.status(200);
                res.send(JSON.stringify(canciones));
            }
        });
    });

    app.get("/api/usuarios", function (req, res) {
        gestorBD.obtenerUsuarios({}, function (canciones) {
            if (canciones == null) {
                res.status(500);
                res.json({
                    error: "se ha producido un error"
                })
            } else {
                res.status(200);
                res.send(JSON.stringify(canciones));
            }
        });
    });

    app.get("/api/cancion/:id", function (req, res) {
        var criterio = {"_id": gestorBD.mongo.ObjectID(req.params.id)}

        gestorBD.obtenerCanciones(criterio, function (canciones) {
            if (canciones == null) {
                res.status(500);
                res.json({
                    error: "se ha producido un error"
                })
            } else {
                res.status(200);
                res.send(JSON.stringify(canciones[0]));
            }
        });
    });

    app.delete("/api/cancion/:id", function (req, res) {
        var criterio = {"_id": gestorBD.mongo.ObjectID(req.params.id)}

        //comprobar que el usuario que quiere BORRAR la canción es el dueño
        //Para ello hay que obtener primero la canción, con su respectivo autor
        var errorDePermisos = false;
        gestorBD.obtenerCanciones(criterio, function (canciones) {
            if (canciones != null && res.usuario && res.usuario != canciones[0].autor)
                errorDePermisos = true;
            if (!errorDePermisos) {
                gestorBD.eliminarCancion(criterio, function (canciones) {
                    if (canciones == null) {
                        res.status(500);
                        res.json({
                            error: "se ha producido un error"
                        })
                    } else {
                        res.status(200);
                        res.send(JSON.stringify(canciones));
                    }
                });
            } else {
                res.status(500);
                res.json({
                    error: "Se ha producido un error: solo el autor puede borrar una canción."
                })
            }

        });

    });

    app.post("/api/cancion", function (req, res) {
        var cancion = {
            nombre: req.body.nombre,
            genero: req.body.genero,
            precio: req.body.precio,
            autor: res.usuario
        }

        //Debe contener todos los datos esperados
        if (cancion.nombre == null || cancion.genero == null || cancion.precio == null) {
            res.status(500);
            res.json({
                error: "Se ha producido un error: una canción debe contener obligatoriamente nombre, genero y precio."
            })
        }

        //Comprobaciones de los datos de la canción
        if (cancion.nombre.trim().length > 50 || cancion.nombre.trim().length < 2 || cancion.genero.trim().length > 50 || cancion.genero.trim().length < 2 || cancion.precio < 0 || cancion.precio > 1000) {
            res.status(500);
            res.json({
                error: "Se ha producido un error: canción con datos inválidos."
            })
        }

        gestorBD.insertarCancion(cancion, function (id) {
            if (id == null) {
                res.status(500);
                res.json({
                    error: "se ha producido un error"
                })
            } else {
                res.status(201);
                res.json({
                    mensaje: "canción insertarda",
                    _id: id
                })
            }
        });

    });

    app.put("/api/cancion/:id", function (req, res) {

        let criterio = {"_id": gestorBD.mongo.ObjectID(req.params.id)};

        let cancion = {}; // Solo los atributos a modificar
        if (req.body.nombre != null)
            cancion.nombre = req.body.nombre;
        if (req.body.genero != null)
            cancion.genero = req.body.genero;
        if (req.body.precio != null)
            cancion.precio = req.body.precio;

        //Comprobar que el usuario que quiere MODIFICAR la canción es el dueño
        //Para ello hay que obtener primero la canción, con su respectivo autor
        var errorDePermisos = false;
        gestorBD.obtenerCanciones(criterio, function (canciones) {
            if (canciones != null && res.usuario && res.usuario != canciones[0].autor)
                errorDePermisos = true;

            if (!errorDePermisos) {
                gestorBD.modificarCancion(criterio, cancion, function (result) {

                    //Comprobaciones de los datos de la canción (no debe contener todos los datos, pues no es un insert, es un update)
                    if (cancion.nombre != null && (cancion.nombre.trim().length > 50 || cancion.nombre.trim().length < 2)
                        || cancion.genero != null && (cancion.genero.trim().length > 50 || cancion.genero.trim().length < 2)
                        || cancion.precio != null && (cancion.precio < 0 || cancion.precio > 1000)) {
                        res.status(500);
                        res.json({
                            error: "Se ha producido un error: los datos introducidos son inválidos."
                        })
                    }

                    if (result == null) {
                        res.status(500);
                        res.json({
                            error: "Se ha producido un error"
                        })
                    } else {
                        res.status(200);
                        res.json({
                            mensaje: "Canción modificada",
                            _id: req.params.id
                        })
                    }
                });
            } else {
                res.status(500);
                res.json({
                    error: "Se ha producido un error: solo el autor puede modificar una canción"
                })
            }

        });

    });

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
            }
        });
    });

    //TODO todas las comprobaciones, como en rusuarios.js
    app.post("/api/mensaje/", function (req, res) {
        //Conseguir usuario en sesión (no, no vale con res.usuario por una razón desconocida)
        //var ussuariosesion=res.usuario;
        cadena = req.headers.cookie.split("loggedUserEmail=");
        cadena2 = cadena[1].split(";");
        usuarioEnSesionEmail = cadena2[0];
        var fecha=new Date();
        var time=fecha.getTime();
        var mensaje = {
            usuarioFrom: usuarioEnSesionEmail, // el emisor es el usuario en sesión
            usuarioTo: req.body.usuarioTo,
            contenido: req.body.contenido,
            leido: false, // por defecto se crea como no leido
            time: time
        };

        if (mensaje.usuarioTo == null || mensaje.usuarioFrom == null || mensaje.contenido == null) {
            res.status(500);
            res.json({
                error: "Se ha producido un error: un mensaje debe contener obligatoriamente emisor, receptor y texto."
            })
        } else {
            gestorBD.insertarMensaje(mensaje, function (id) {
                if (id == null) {
                    res.send("Error al enviar mensaje");
                } else {
                    res.json({
                        mensaje: "Mensaje enviado con éxito.",
                        _id: id
                    });
                }
            });
        }

    });

    app.get("/api/mensaje", function (req, res) {
        gestorBD.obtenerMensajes(req.query.usuarioFrom, req.query.usuarioTo, function (canciones) {
            if (canciones == null) {
                res.status(500);
                res.json({
                    error: "se ha producido un error"
                })
            } else {
                res.status(200);
                res.send(JSON.stringify(canciones));
            }
        });
    });

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
                })
            } else {
                res.status(200);
                res.json({
                    mensaje: "Mensajes recibidos marcados como leidos",
                    _id: req.params.id
                })
            }
        });
    });

}