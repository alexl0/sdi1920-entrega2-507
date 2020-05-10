module.exports = function (app, swig) {
    /**
     * Muestra el error correspondiente si se intenta
     * acceder a un recurso que no está disponible.
     * Generalmente sucede cuando se intenta acceder a un
     * link de hace mucho tiempo
     */
    app.get('/error/:mensaje', function (req, res) {
        let respuesta = swig.renderFile('views/error.html',
            {
                mensaje : req.params.mensaje
            }
        );
        res.send(respuesta);
    });
};