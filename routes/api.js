/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb').MongoClient; // I added '.MongoClient'
var ObjectId = require('mongodb').ObjectID;

const CONNECTION_STRING = process.env.DB; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});

module.exports = function (app) {

  app.route('/api/issues/:project')
  
    .get(function (req, res){
      var project = req.params.project,
          keys = Object.keys(req.query),
          filter = {},
          keyList = ['_id',
             'issue_title',
             'issue_text',
             'created_by',
             'assigned_to',
             'status_text',
             'created_on',
             'updated_on',
             'open'];
      
      // We loop on queries and return :
      // - an empty result if one query is not correct
      // - the result if all queries are ok
      for (let i=0; i<keys.length; i++){
        let key = keys[i];
        if(!keyList.includes(key)){
          return res.json({})
        }
        else {
          filter[key] = req.query[key];
        }
      }
    
      MongoClient.connect(CONNECTION_STRING, { useNewUrlParser: true, useUnifiedTopology: true }, function(err, client) {
        // Since I use mongodb v3.5.7 (and not v2.2.xx), I must instantiate a db from the 'client' parameter of the function
        // Furthermore, I have to name my db (otherwise it doesn't work...)
        let db = client.db('Issue_Tracking');
        
        // And then, we get the issues for this project !
        db.collection(project).find(filter)
          .toArray().then(data => {
            res.json(data);
          });
        // 'db.collection.find' returns a Cursor to the documents
        // We then convert this Cursor into an array...
        // ... and we have to use 'then' to tell what to do ...
        // ... otherwise it would be a pending Promise.
        // Here is a good explanation of this:
        // https://stackoverflow.com/questions/45198268/mongodb-cursor-toarray-returns-promise-pending
      })      
    })
    
    .post(function (req, res){
      var project = req.params.project;
      let issue,
          assigned_to,
          status_text,
          id = new ObjectId(),
          date = new Date();
      req.body.assigned_to == ''?assigned_to = '':assigned_to = req.body.assigned_to;
      req.body.status_text == ''?status_text = '':status_text = req.body.status_text;
      if(req.body.issue_title == null || req.body.issue_text == null || req.body.created_by == null){
        return res.send('Missing at least one the following inputs: issue_title, issue_text, created_by')
      }
      issue = {
        _id: id,
        issue_title: req.body.issue_title,
        issue_text: req.body.issue_text,
        created_by: req.body.created_by,
        assigned_to: assigned_to,
        status_text: status_text,
        created_on: date,
        updated_on: date,
        open: true
      };
      MongoClient.connect(CONNECTION_STRING, { useNewUrlParser: true, useUnifiedTopology: true }, function(err, client) {
        // Since I use mongodb v3.5.7 (and not v2.2.xx), I must instantiate a db from the 'client' parameter of the function
        // Furthermore, I have to name my db (otherwise it doesn't work...)
        let db = client.db('Issue_Tracking');
        
        // And then, we insert an issue !
        db.collection(project).insertOne(issue, function(err, doc) {
            if(err) console.log(err);
            res.send(issue);
        });
      })
    })
 
    .put(function (req, res){
      var project = req.params.project,
          id,
          date = new Date(),
          update = {},
          keys = Object.keys(req.body);
      try {
        id = ObjectId(req.body._id)
      }
      catch(error) {
        return res.send('The format of this id is not correct');
      }
      for (let i=0; i<keys.length; i++){
        let key = keys[i];
        if((key == '_id') || (req.body[key] == '')){
          continue
        }
        else if(key == 'open'){
          update[key] = false
        }
        else {
          update[key] = req.body[key];
        }
      }
      if (Object.keys(update).length == 0){ // I had to write this condition, instead of 'update == {}' or 'update == null', which return 'false'
        return res.send('no updated field sent');
      } else {
        update.updated_on = date;
      }
      MongoClient.connect(CONNECTION_STRING, { useNewUrlParser: true, useUnifiedTopology: true }, function(err, client) {
        // Since I use mongodb v3.5.7 (and not v2.2.xx), I must instantiate a db from the 'client' parameter of the function
        // Furthermore, I have to name my db (otherwise it doesn't work...)
        let db = client.db('Issue_Tracking');
        
        // And then, we find an issue by its id and update it !
        // I did not use 'findOneAndUpdate' since the query (the filter) has to be a document
        // WARNING: I had to use '{$set: update}' - and not merely 'update' - to apply updates without overwriting the document
        db.collection(project).update({_id: id}, {$set: update}, function(err, doc) {
          if(err) return res.send('could not update '+id);
          res.send('successfully updated')
        });
      })
    })
    
    .delete(function (req, res){
      var project = req.params.project,
          id;
      if(!req.body._id) {
        return res.send('_id error');
      }
      else {
        try {
          id = ObjectId(req.body._id)
        }
        catch(error) {
          return res.send('The format of this id is not correct')
        }
      }
      MongoClient.connect(CONNECTION_STRING, { useNewUrlParser: true, useUnifiedTopology: true }, function(err, client) {
        // Since I use mongodb v3.5.7 (and not v2.2.xx), I must instantiate a db from the 'client' parameter of the function
        // Furthermore, I have to name my db (otherwise it doesn't work...)
        let db = client.db('Issue_Tracking');
        
        // And then, we delete this issue ! (Warning: 'remove' method is deprecated)
        db.collection(project).deleteOne({_id: id}, function(err, doc){
          if(err) return res.send('could not delete '+id);
          res.send('deleted '+id);
        })
      });
    });
    
};
