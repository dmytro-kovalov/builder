var vcCake = require('vc-cake');
vcCake.add('ui-wordpress', function(api){
  var React = require('react');
  var classNames = require('classnames');
  var Control = React.createClass({
    clickSaveData: function () {
      var _this = this;
      this.setState( {'saving': true} );
      setTimeout( function (  ) {
        _this.setState( {'saving': false} );
        _this.setState( {'saved': true} );
      }, 3000 );
      setTimeout( function (  ) {
        _this.setState( {'saved': false} );
      }, 5000 );
      // this.publish( 'app:save', true );
    },
    render: function() {
      var saveButtonClasses = classNames( {
        "vc-ui-navbar-control": true,
        "vc-ui-state-success": this.state.saved
      } );
      var saveIconClasses = classNames( {
        "vc-ui-navbar-control-icon": true,
        "vc-ui-wp-spinner": this.state.saving,
        "vc-ui-icon": !this.state.saving,
        "vc-ui-icon-save": !this.state.saving
      } );
      return (<div className="vc-ui-navbar-controls-group vc-ui-pull-end">
        <a className={saveButtonClasses} href="#" title="Save" onClick={this.clickSaveData}><span className="vc-ui-navbar-control-content">
              <i className={saveIconClasses}></i><span>Save</span>
            </span></a>
      </div>);
    }
  });
  api.module('ui-navbar').do('addElement', 'Save post', Control, 'right');
});