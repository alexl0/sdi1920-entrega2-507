module.exports = function (app, swig, gestorBD) {
    app.post("/comentario/:id", function (req, res) {
        if (req.session.usuario == null) {
            res.redirect("/identificarse");
            return;
        }
        let criterio = {
            "_id": gestorBD.mongo.ObjectID(req.params.id)
        };
        gestorBD.obtenerCanciones(criterio, function (canciones) {
            if (canciones == null) {
                res.send(respuesta);
            } else {
                let comentario = {
                    autor: req.session.usuario,
                    texto: req.body.texto,
                    cancion_id: canciones[0]._id
                }
                gestorBD.insertarComentario(comentario, function (id) {
                    if (id == null) {
                        res.send("Error al insertar comentario");
                    } else {
                        res.send("Agregada id: " + id);
                    }
                });
            }
        });
    });
};