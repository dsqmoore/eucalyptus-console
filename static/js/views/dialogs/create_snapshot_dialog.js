define([
   './eucadialogview',
   'text!./create_snapshot_dialog.html!strip',
   'models/snapshot',
   'app',
   'backbone',
], function(EucaDialogView, template, Snapshot, App, Backbone) {
    return EucaDialogView.extend({

        disableVolumeInputBox: function(){
          var $volumeSelector = this.$el.find('#snapshot-create-volume-id');
          $volumeSelector.attr('disabled', 'disabled');
        },

        // SET UP AUTOCOMPLETE FOR THE VOLUME INPUT BOX
        setupAutoComplete: function(args){
            var self = this;
            
            if( args.volume_id == undefined ){
              // CASE: CALLED FROM THE SNAPSHOT LANDING PAGE
              var vol_ids = [];
              App.data.volume.each(function(v){
                console.log("Volume ID: " + v.get('id') + "  Status:" + v.get('status'));
                var nameTag = self.findNameTag(v);
                var autocomplete_string = String(self.createIdNameTagString(v.get('id'), nameTag));
                vol_ids.push(autocomplete_string);
              });

              var sorted = sortArray(vol_ids);
              console.log("Autocomplete Volume List: " + sorted);

              var $volumeSelector = this.$el.find('#snapshot-create-volume-id');
              $volumeSelector.autocomplete({
                source: sorted
              });
            }else{
              // CASE: CALLED FROM THE VOLUME LANDING PAGE
              // DISABLE THE VOLUME INPUT BOX
              this.disableVolumeInputBox();
              // DISPLAY ITS NAME TAG FOR VOLUME ID
              var foundNameTag = self.findNameTag(App.data.volume.get(args.volume_id));
              self.scope.snapshot.set({volume_id: String(self.createIdNameTagString(args.volume_id, foundNameTag))});
            } 
        },

        // CONSTRUCT A STRING THAT DISPLAYS BOTH RESOURCE ID AND ITS NAME TAG
        createIdNameTagString: function(resource_id, name_tag){
          var this_string = resource_id;
          if( name_tag != null ){
            this_string += " (" + name_tag + ")";
          }
          return this_string;
        },

        // UTILITY FUNCTION TO DISCOVER THE NAME TAG OF CLOUD RESOURCE MODEL
        findNameTag: function(model){
          var nameTag = null;
          model.get('tags').each(function(tag){
            if( tag.get('name').toLowerCase() == 'name' ){
              nameTag = tag.get('value');
            };
          });
          return nameTag;
        },

        initialize : function(args) {
            var self = this;
            this.template = template;

            this.scope = {
                status: '',
                snapshot: new Snapshot({volume_id: args.volume_id, description: ''}),

                cancelButton: {
                  click: function() {
                    self.close();
                  }
                },

                createButton: {
                  click: function() {
	            // GET THE INPUT FROM HTML VIEW
	            var volumeId = self.scope.snapshot.get('volume_id');
	            var description = self.scope.snapshot.get('description');
		    console.log("Selected Volume ID: " + volumeId);
		    console.log("Volume Description: " + description);

                    // EXTRACT THE RESOURCE ID IF THE NAME TAG WAS FOLLOWED
                    if( volumeId.match(/^\w+-\w+\s+/) ){
                      volumeId = volumeId.split(" ")[0];
		      console.log("Volume ID: " + volumeId);
                    }

	            // CONSTRUCT AJAX CALL RESPONSE OPTIONS
	            var createAjaxCallResponse = {
	              success: function(data, response, jqXHR){   // AJAX CALL SUCCESS OPTION
		        console.log("Callback " + response + " for " + volumeId);
			if(data.results){
			  snapId = data.results.id;
			  notifySuccess(null, $.i18n.prop('snapshot_create_success', snapId, volumeId));    // XSS risk  -- Kyo 040713
			}else{
			  notifyError($.i18n.prop('snapshot_create_error', volumeId, undefined_error));     // XSS risk
			}
	              },
		      error: function(jqXHR, textStatus, errorThrown){  // AJAX CALL ERROR OPTION
		        console.log("Callback " + textStatus  + " for " + volumeId + " error: " + getErrorMessage(jqXHR));
			notifyError($.i18n.prop('snapshot_create_error', volumeId), getErrorMessage(jqXHR));                     // XSS risk
		      }
	            };

	            // PERFORM CREATE CALL OM THE MODEL
	            var new_snapshot = new Snapshot({volume_id: volumeId, description: description}); 
	            new_snapshot.sync('create', new_snapshot, createAjaxCallResponse);

	            // DISPLAY THE MODEL LIST FOR VOLUME AFTER THE DESTROY OPERATION
	            App.data.snapshot.each(function(item){
	              console.log("Snapshot After Create: " + item.toJSON().id);
	            });

	            // CLOSE THE DIALOG
	            self.close();
                  }
                }
            };

            this._do_init();

            this.setupAutoComplete(args);
        },
    });
});
