module.exports = {
    mongo: null,
    app: null,
    /**
     * Inicializar la base de datos
     * @param app
     * @param mongo
     */
    init: function (app, mongo) {
        this.mongo = mongo;
        this.app = app;
    },
    /**
     * Inserta un usuario(se comprueba que no existe ese email
     * en la base de datos en el router rusuarios)
     * @param usuario
     * @param funcionCallback
     */
    insertarUsuario: function (usuario, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                let collection = db.collection('usuarios');
                collection.insert(usuario, function (err, result) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(result.ops[0]._id);
                    }
                    db.close();
                });
            }
        });
    },
    /**
     * Se utiliza tanto como para comprobar si un usuario existe.
     * También para obtener otros campos de un usuario
     * aparte del email (nombre y apellidos).
     * Para el listado de la vista de usuarios ya se utiliza
     * obtenerUsuariosPg
     * @param criterio
     * @param funcionCallback
     */
    obtenerUsuarios: function (criterio, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                let collection = db.collection('usuarios');
                collection.find(criterio).toArray(function (err, usuarios) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(usuarios);
                    }
                    db.close();
                });
            }
        });
    },
    /**
     * Se utiliza para moostrar los usuarios en la vista de lista
     * de usuarios. Se utiliza paginación.
     * Para hacer comprobaciones se utilziza obtenerUsuarios(), que es
     * igual pero sin paginación.
     * @param criterio
     * @param pg
     * @param usuarioLogueado
     * @param funcionCallback
     */
    obtenerUsuariosPg: function (criterio, pg, usuarioLogueado, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                let collection = db.collection('usuarios');
                collection.count(criterio, function (err, count) {
                    collection.find(criterio).skip((pg - 1) * 5).limit(5)
                        .toArray(function (err, usuarios) {
                            if (err) {
                                funcionCallback(null);
                            } else {
                                var usuariosSinUsuarioLogueado = usuarios.filter(function (value, index, arr) {
                                    return value.email != usuarioLogueado;
                                });
                                funcionCallback(usuariosSinUsuarioLogueado, count);
                            }
                            db.close();
                        });
                });
            }
        });
    },
    /**
     * Inserta una invitación en la base de datos, cuyo usuarioFrom será
     * el email del usuario en sesión y usuarioTo será el usuario parámetro.
     * Las comprobaciones pertinentes se hacen en rusuarios.js
     * @param usuarioFrom
     * @param usuarioTo
     * @param funcionCallback
     */
    insertarInvitacion: function (usuarioFrom, usuarioTo, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                let collection = db.collection('invitaciones');
                var invitacion = {
                    usuarioFrom: usuarioFrom,
                    usuarioTo: usuarioTo
                };
                collection.insert(invitacion, function (err, result) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(result.ops[0]._id);
                    }
                    db.close();
                });
            }
        });
    },
    /**
     * Se utiliza para hacer comprobaciones por ejemplo para ver si un usuario tiene
     * invitaciones a la hora de aceptarlas, o para no mostrar el botón de agregar
     * si ya se ha enviado una petición. Para listarlas en la vista, ya se utiliza
     * obtenerInvitacionesPg()
     * @param criterio
     * @param funcionCallback
     */
    obtenerInvitaciones: function (criterio, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                let collection = db.collection('invitaciones');
                collection.find(criterio).toArray(function (err, invitaciones) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(invitaciones);
                    }
                    db.close();
                });
            }
        });
    },
    /**
     * Se utiliza para mostrar la lista de invitaciones en la vista de invitaciones.
     * Para comprobaciones ya se utiliza obtenerInvitaciones()
     * @param criterio
     * @param pg
     * @param funcionCallback
     */
    obtenerInvitacionesPg: function (criterio, pg, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                let collection = db.collection('invitaciones');
                collection.count(function (err, count) {
                    collection.find(criterio).skip((pg - 1) * 5).limit(5)
                        .toArray(function (err, invitaciones) {
                            if (err) {
                                funcionCallback(null);
                            } else {
                                funcionCallback(invitaciones, count);
                            }
                            db.close();
                        });
                });
            }
        });
    },
    /**
     * Se utiliza para borrar una invitación despues de aceptarla, para que deje
     * de aparecer, ya que no se le puede seguir dando uso, ya no sirve para
     * nada una vez los usuarios son amigos.
     * @param criterio
     * @param funcionCallback
     */
    eliminarInvitacion: function (criterio, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                let collection = db.collection('invitaciones');
                collection.remove(criterio, function (err, result) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(result);
                    }
                    db.close();
                });
            }
        });
    },
    /**
     * Inserta en la base de datos la relacción de amistad de dos amigos.
     * Solamente se almacenan sus emails para no repetir datos.
     * Para acceder al resto de campos (nombre y apellidos), se utiliza
     * obtenerUsuarios()
     * @param email1
     * @param email2
     * @param funcionCallback
     */
    insertarAmigos: function (email1, email2, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                let collection = db.collection('amigos');
                let amistad = {
                    email1: email1,
                    email2: email2
                }
                collection.insert(amistad, function (err, result) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(result.ops[0]._id);
                    }
                    db.close();
                });
            }
        });
    },
    /**
     * Se utiliza para comprobar si dos usuarios son amigos, por ejemplo
     * para no dejar mandar una invitación a un usuario que ya es amigo.
     * Para el listado ya se utiliza obtenerAmigosPg()
     * @param usuario
     * @param funcionCallback
     */
    obtenerAmigos: function (usuario, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                let criterio = {
                    $or: [
                        {
                            "email1": usuario
                        },
                        {
                            "email2": usuario
                        }
                    ]
                }
                let collection = db.collection('amigos');
                collection.find(criterio).toArray(function (err, amigos) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        /**
                         * Los amigos ya se ordenan en widget-amigos.html
                         * Pero está bien que la lista vaya ya ordenada porque así de
                         * primeras ya se lista bien.
                         */
                        for (i = 0; i < amigos.length - 1; i++) {
                            if ((amigos[i].time == null && amigos[i + 1].time != null) || amigos[i].time < amigos[i + 1].time) {
                                var temp = amigos[i];
                                amigos[i] = amigos[i + 1];
                                amigos[i + 1] = temp;
                            }
                        }
                        funcionCallback(amigos);
                    }
                    db.close();
                });
            }
        });
    },
    /**
     * Se utiliza para obtener los amigos y listarlos en la vista
     * de listado de amigos. No se utiliza para comprobaciones, ya
     * que para ese fin ya está obtenerAmigos()
     * @param usuario
     * @param pg
     * @param funcionCallback
     */
    obtenerAmigosPg: function (usuario, pg, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                let criterio = {
                    $or: [
                        {
                            "email1": usuario
                        },
                        {
                            "email2": usuario
                        }
                    ]
                }
                let collection = db.collection('amigos');
                collection.count(function (err, count) {
                    collection.find(criterio).skip((pg - 1) * 5).limit(5)
                        .toArray(function (err, amigos) {
                            if (err) {
                                funcionCallback(null);
                            } else {
                                funcionCallback(amigos, count);
                            }
                            db.close();
                        });
                });
            }
        });
    },
    /**
     * Dados dos emails, devuelve true si son amigos, y false si no lo es.
     * Se ha implementado éste método con la intención de simplificar el código
     * en los routers y abstraer operaciones de comprobación.
     * Se utiliza para evitar mandar una invitación a un usuario que ya es
     * amigo, por ejemplo.
     * @param usuario1
     * @param usuario2
     * @param funcionCallback
     */
    comprobarSiSonAmigos: function (usuario1, usuario2, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                let criterio = {
                    $or: [
                        {
                            $and: [
                                {"email1": usuario1},
                                {"email2": usuario2}
                            ]
                        },
                        {
                            $and: [
                                {"email2": usuario1},
                                {"email1": usuario2}
                            ]
                        }
                    ]
                };
                let collection = db.collection('amigos');
                collection.find(criterio).toArray(function (err, amigos) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(amigos.length > 0);
                    }
                    db.close();
                });
            }
        });
    },
    /**
     * Se utiliza para comprobar si es posible mandar una invitación de amistad,
     * ya que no se debería poder mandar una invitación a un usuario que ya
     * se ha invitado anteriormente, o que ya te ha invitado a ti.
     * @param usuario1
     * @param usuario2
     * @param funcionCallback
     */
    comprobarSiHayInvitaciones: function (usuario1, usuario2, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                let criterio = {
                    $or: [
                        {
                            $and: [
                                {"usuarioFrom": usuario1},
                                {"usuarioTo": usuario2}
                            ]
                        },
                        {
                            $and: [
                                {"usuarioTo": usuario1},
                                {"usuarioFrom": usuario2}
                            ]
                        }
                    ]
                };
                let collection = db.collection('invitaciones');
                collection.find(criterio).toArray(function (err, amigos) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(amigos.length > 0);
                    }
                    db.close();
                });
            }
        });
    },
    /**
     * Inserta un mensaje en la base de datos.
     * Después de llamar a ésta función, en el router, se modifica la
     * tabla de amigos para insertar un atributo time el cual representa un tiempo en
     * milisegundos, que a mayor sea, menos tiempo hace que se ha enviado o recibido
     * un mensaje con ese usuario.
     * @param mensaje
     * @param funcionCallback
     */
    insertarMensaje: function (mensaje, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                let collection = db.collection('mensajes');
                collection.insert(mensaje, function (err, result) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(result.ops[0]._id);
                    }
                    db.close();
                });
            }
        });
    },
    /**
     * Se utiliza para mostrar los mensajes en la vista de chat.
     * También para comprobar si hay mensajes nuevos, y de no ser así,
     * no se actualiza innecesariamente la tabla de mensajes.
     * @param criterio
     * @param funcionCallback
     */
    obtenerMensajes: function (criterio, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                let collection = db.collection('mensajes');
                collection.find(criterio).toArray(function (err, mensajes) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(mensajes);
                    }
                    db.close();
                });
            }
        });
    },
    /**
     * Dado un mensaje, pone el atributo leido a true.
     * Después de ponerlo a true, la lista de mensajes se recarga automáticamente
     * por lo que un usuario no tendrá que hacer nada. Se le pondrá el mensaje con el
     * símbolo de leído si está en la vista de chat.
     * @param criterio
     * @param mensaje
     * @param funcionCallback
     */
    modificarMensajeMarcarLeido: function (criterio, mensaje, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                let collection = db.collection('mensajes');
                collection.update(criterio, {
                    $set: mensaje
                }, {multi: true}, function (err, result) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(result);
                    }
                    db.close();
                });
            }
        });
    },
    /**
     * Se utiliza para modificar o añadir el atributo time de una relacción de amistad,
     * el cual representa un tiempo en milisegundos, que a mayor sea, menos tiempo hace
     * que se habla con ese amigo.
     * @param criterio
     * @param funcionCallback
     */
    modificarAmigos: function (criterio, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                var fecha = new Date();
                var time = {"time": fecha.getTime()};
                let collection = db.collection('amigos');
                collection.update(criterio, {
                    $set: time
                }, function (err, result) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(result);
                    }
                    db.close();
                });
            }
        });
    },


    //Limpiar la base de datos
    /**
     * #####################################################################
     * #####################################################################
     * #####################################################################
     * #####################################################################
     * ########################## ATENCIÓN #################################
     * #####################################################################
     * En una aplicación comercial no se haría esto bajo ninguna
     * circunstancia. Solo tiene la intención de facilitar la
     * ejecución de los test.
     */

    /**
     * Limpiar la lista de usuarios
     * @param funcionCallback
     */
    eliminarUsuarios: function (funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                let collection = db.collection('usuarios');
                collection.remove({}, function (err, result) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(result);
                    }
                    db.close();
                });
            }
        });
    },
    /**
     * Limpia la lista de invitaciones
     * @param funcionCallback
     */
    eliminarInvitaciones: function (funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                let collection = db.collection('invitaciones');
                collection.remove({}, function (err, result) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(result);
                    }
                    db.close();
                });
            }
        });
    },
    /**
     * Limpia la lista de amigos
     * @param funcionCallback
     */
    eliminarAmigos: function (funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                let collection = db.collection('amigos');
                collection.remove({}, function (err, result) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(result);
                    }
                    db.close();
                });
            }
        });
    },
    /**
     * Limpia la lista de mensajes
     * @param funcionCallback
     */
    eliminarMensajes: function (funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                let collection = db.collection('mensajes');
                collection.remove({}, function (err, result) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(result);
                    }
                    db.close();
                });
            }
        });
    }
};