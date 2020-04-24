module.exports = function (app, swig) {
    app.get('/error/:mensaje', function (req, res) {
        let respuesta = swig.renderFile('views/error.html',
            {
                mensaje : req.params.mensaje
            }
        );
        res.send(respuesta);
    });
};