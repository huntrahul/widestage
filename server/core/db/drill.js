var Client = require('node-rest-client').Client;


var db = function () {
    /*this.host = data.host;
     this.user = data.userName;
     this.password = data.password;
     this.database = data.database;*/
    this.connection = null;
};

exports.db = db;


db.prototype.connect = function(data, done) {
   /* var DB = this;

    DB.connection = hive;

    var jsonFile = __dirname + '/../../keys/COMPID/bigQuery/Essential_Big_Data-b8c90025164d.json';

    hive.init({
        json_file: jsonFile
    });*/


};


exports.testConnection = function(data, setresult) {
console.log('connection to drill at ',data.host,data.database);
    var client = new Client();

    // get drill stats
    /*
    client.get(data.host+"/stats.json", function (data, response) {
        // parsed response body as js object
        console.log(data);
        // raw response
        console.log(response);
    });
    */
    //   /Users/hermesromero/downloads/results-20161129-110714.csv

    if (data.type == 'DRILL-FILE')
        {
            var theQuery = {"queryType":"SQL", "query": "select columns[0], columns[1] from dfs.`"+data.database+"` limit 10 skip 1"};
        }
    if (data.type == 'DRILL-HIVE')
        {

        }

    var args = {
        data: theQuery,
        headers: { "Content-Type": "application/json" }
    };

    client.post(data.host+"query.json", args, function (data, response) {
        // parsed response body as js object
        console.log(data);
        // raw response
        // console.log(response.body);
    });

    /* var jsonFile = __dirname + '/../../keys/COMPID/bigQuery/Essential_Big_Data-b8c90025164d.json';

    hive.init({
        json_file: jsonFile
    });

    hive.dataset.list(data.database, function(e,r,d){
        if(e) {
            console.log(e);
            setresult({result: 0, msg: 'Connection Error: '+ e});
        }

        var jsonObj = JSON.parse(d);
        var rows = [];
        if (d)
        {

            getBigqueryDataset(hive,data.database,jsonObj,0,rows,function(){
                setresult({result: 1, items: rows});
            });

        }

    });
*/
};

function getBigqueryDataset(hive,database,jsonObj,index,rows,done)
{
    if (jsonObj.datasets[index] == undefined)
        {
          done();

        } else {
            hive.table.list(database, jsonObj.datasets[index].datasetReference.datasetId, function(e,r,d){
                    if(e) console.log(e);
                    var jsonObj2 = JSON.parse(d);

                    for (var z in jsonObj2.tables)
                    {
                        rows.push({name:jsonObj2.tables[z].id});
                    }


                    getBigqueryDataset(hive,database,jsonObj,index+1,rows,done);



                });

        }

}


exports.getSchemas = function(data, setresult) {


        var collections = data.entities;



        //get schemas
        var projects = [];
        var datasets = [];
        var tables = [];
        var schemasTables = [];


        for (var i in collections) {
            var res0 = String(collections[i].name).split(':');
            var project = res0[0];
            var res1 = String(res0[1]).split('.');
            var dataset = res1[0];
            var table = res1[1];


            if (projects.indexOf(project) == -1)
                projects.push(project);
            if (datasets.indexOf(dataset) == -1)
                datasets.push(dataset);
            if (tables.indexOf(table) == -1)
                tables.push(table);

            if (schemasTables.indexOf({name: collections[i].name,project:project, dataset:dataset, table:table}) == -1)
            {
                var stable = {name: collections[i].name,project:project, dataset:dataset, table:table};
                schemasTables.push(stable);
            }

        }




        getTableFields(schemasTables,0,[],function(fields){
            setresult({result: 1, items: fields});
        });

};

function generateShortUID() {
    return ("0000" + (Math.random()*Math.pow(36,4) << 0).toString(36)).slice(-4)
}


function getTableFields(tables,index,fields, done)
{
    if (!tables[index])
    {
        done(fields);
        return;

    } else {

        var jsonFile = __dirname + '/../../keys/COMPID/bigQuery/Essential_Big_Data-b8c90025164d.json';
        var collectionID = 'WST'+generateShortUID();
        var collectionName = tables[index].dataset+'.'+tables[index].table;
        var theCollection = {collectionID: collectionID ,collectionName: collectionName,visible:true,collectionLabel:tables[index].table};
        theCollection.elements = [];

        hive.init({
            json_file: jsonFile
        });


        hive.table.get(tables[index].project, tables[index].dataset, tables[index].table, function(e,r,d){
            if(e) console.log(e);
            var jsonObj = JSON.parse(d);

            for (var i in jsonObj.schema.fields)
            {


                var elementID = generateShortUID();
                var isVisible = true;
                var type = 'string';
                if (jsonObj.schema.fields[i].type == 'INTEGER' || jsonObj.schema.fields[i].type == 'FLOAT')
                    type = 'number';
                if (jsonObj.schema.fields[i].type == 'TIMESTAMP')
                    type = 'date';
                if (jsonObj.schema.fields[i].type == 'BOOLEAN')
                    type = 'boolean';

                theCollection.elements.push({elementID:elementID,elementName:jsonObj.schema.fields[i].name,elementType:type,visible:isVisible,elementLabel:jsonObj.schema.fields[i].name});
                //table_schema, c.table_name, c.column_name, c.data_type
            }

            fields.push(theCollection);

            getTableFields(tables,index+1,fields,done);
        });

    }
}


db.prototype.getLimitString = function(limit, offset) {
    return 'LIMIT '+limit+' OFFSET '+offset;
};

db.prototype.executeSQLQuery = function(connection,sql,done){

    var jsonFile = __dirname + '/../../keys/COMPID/bigQuery/Essential_Big_Data-b8c90025164d.json';
    hive.init({
        json_file: jsonFile
    });

    hive.job.query(connection.database, sql, function(e,r,d){
        if(e) {
                console.log(e);
              }

        if (d.jobComplete)
            {
                var jsonObj = JSON.parse(JSON.stringify(d));

                var results = [];

                for (var r in jsonObj.rows)
                {
                        var theRow = {};
                        for (var field in jsonObj.schema.fields)
                        {
                            theRow[jsonObj.schema.fields[field].name] = jsonObj.rows[r].f[field].v;
                        }
                        results.push(theRow);

                }
                done(results);
            } else {

                getQueryResults(connection,d.jobReference.jobId,function(){
                    done(results);
                });

            }
    });
}

function getQueryResults(connection,jobId,done){

    var jsonFile = __dirname + '/../../keys/COMPID/bigQuery/Essential_Big_Data-b8c90025164d.json';
    hive.init({
        json_file: jsonFile
    });


                hive.job.getQueryResults(connection.database,jobId, function(e,r,d){
                        var jsonObj = JSON.parse(JSON.stringify(d));

                        var results = [];

                        for (var r in jsonObj.rows)
                        {
                                var theRow = {};
                                for (var field in jsonObj.schema.fields)
                                {
                                    theRow[jsonObj.schema.fields[field].name] = jsonObj.rows[r].f[field].v;
                                }
                                results.push(theRow);

                        }
                        done(results);
                });
}
