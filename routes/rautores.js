module.exports = function(app, swig) {

    app.get("/autores", function(req, res) {
        var autores = [ {
            "nombre" : "Kurt Kobain",
            "grupo" : "Nirvana",
            "rol" : "Vocalista"
        }, {
            "nombre" : "Aubrey Ashburn",
            "grupo" : "Devil May Cry 4 Original Soundtrack",
            "rol" : "Mujer vocalista"
        }, {
            "nombre" : "Tetsuya Shibata",
            "grupo" : "Devil May Cry 4 Original Soundtrack",
            "rol" : "Primary composer"
        } ];
        let respuesta = swig.renderFile('views/autores.html', {
            vendedor : 'Lista de autores',
            autores : autores
        });
        res.send(respuesta);
    });

    app.get('/autores/agregar', function(req, res) {
        let respuesta = swig.renderFile('views/autores-agregar.html', {});
        res.send(respuesta);
    })

    app.post("/autor",function(req,res){
        var cadena="";
        if(req.body.nombre!=null)
            cadena+="Autor agregado: "+req.body.nombre +"<br>";
        if(req.body.grupo!=null)
            cadena+="Grupo: " +req.body.grupo +"<br>";
        if(req.body.rol!=null)
            cadena+="Rol: "+req.body.rol;
        res.send(cadena);
    });

    app.get('/autores/*', function (req, res) {
        res.redirect("/autores");
    });

}