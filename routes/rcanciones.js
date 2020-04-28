module.exports = function (app, swig, gestorBD) {

    app.get("/tienda", function (req, res) {
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
                                let respuesta = swig.renderFile('views/btienda.html', {
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

    app.get('/compras', function (req, res) {
        gestorBD.obtenerAmigos(req.session.usuario, function (amigos) {
            if (amigos == null) {
                res.send("Error al listar");
            } else {
                let respuesta = swig.renderFile('views/bcompras.html',
                    {
                        amigos: amigos,
                        usuario: req.session.usuario
                    });
                res.send(respuesta);
            }
        });
    });

    //Ejemplo estructura abajo

    app.post('/cancion/modificar/:id', function (req, res) {
        let id = req.params.id;
        let criterio = {
            "_id": gestorBD.mongo.ObjectID(id)
        };
        let cancion = {
            nombre: req.body.nombre,
            genero: req.body.genero,
            precio: req.body.precio
        }
        gestorBD.modificarCancion(criterio, cancion, function (result) {
            if (result == null) {
                res.send("Error al modificar ");
            } else {
                paso1ModificarPortada(req.files, id, function (result) {
                    if (result == null) {
                        res.send("Error en la modificación");
                    } else {
                        res.redirect("/invitaciones");
                    }
                });
            }
        });
    });

    function paso1ModificarPortada(files, id, callback) {
        if (files && files.portada != null) {
            let imagen = files.portada;
            imagen.mv('public/portadas/' + id + '.png', function (err) {
                if (err) {
                    callback(null); // ERROR
                } else {
                    paso2ModificarAudio(files, id, callback); // SIGUIENTE
                }
            });
        } else {
            paso2ModificarAudio(files, id, callback); // SIGUIENTE
        }
    };

    function paso2ModificarAudio(files, id, callback) {
        if (files && files.audio != null) {
            let audio = files.audio;
            audio.mv('public/audios/' + id + '.mp3', function (err) {
                if (err) {
                    callback(null); // ERROR
                } else {
                    callback(true); // FIN
                }
            });
        } else {
            callback(true); // FIN
        }
    };

};