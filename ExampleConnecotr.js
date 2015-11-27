/*
 * ExampleConnector.js
 *
 * Sample Oracle Sales Cloud Contact Center Connector.
 *
 * Example implementation the comm_connector interface as described by the
 * "Oracle Fusion Contact Center Connector Specification" available from
 * support.oracle.com (Doc ID 1495154.1)
 *
 * This code is provided as a sample only. Not intended for production use.
 *
 * The location of this file must be configured in the Contact Center
 * Connector Configuration for dynamic loading by the toolbar
 * framework at runtime.
 *
 * 2014-04-17 - Update for Release 8 Contact Center Toolbar with Chat support
 * 2014-10-17 - Updates to work with IE
 * 2015-01-28 - Added findActivity() example for Sales Cloud Release 9+
 * 2015-04-20 - Changed fixed call Ids to generated call Ids to better demonstrate multiple active calls
 * 2015-04-20 - Added OutboundCall() example demonstrating outbound calls started from separate dialer
 * 2015-07-06 - Added example event methods
 *
 */

// save the connector instance so the inboundCall() can use it.
var theConnector;

var comm_connector = {

	/**
	 * This must return a handle to an instance of the custom connector object.
	 */
	getConnector : function(){
	 	console.info("comm_connector.getConnector()");
		theConnector = new ExampleConnector();
		return theConnector;
	},


	/**
	 * Allow the connector to start up any processes required for communication purposes.
	 * When the connector is able to establish communications with the service provider
	 * it should invoke the serverLaunchCallback with a value of true.
	 * This must be implemented in order for the logon command to be executed.
	 *
	 * downloadLocation - The location of a jnlp file if a Java Web Start Application is required.
	 * serverUrl - This defines the location of your service provider.
	 * serverLaunchCallback - This callback object must be invoked with a value of true once the connector has verified communications with the service provider.
	 */
	launchServer : function("https://docs.oracle.com/javase/tutorialJWS/samples/deployment/dynamictree_webstartJWSProject/dynamictree_webstart.jnlp", serverUrl, serverLaunchCallback){
		console.info("comm_connector.launchServer(" + downloadLocation + ", " + serverUrl + ", <serverLaunchCallback>)");
		//if needed perform steps needed to launch connectorserver
		//invoke callback
		serverUp = true;
		serverLaunchCallback(serverUp);
	},


	isServerUp : function() {
		console.info("comm_connector.isServerUp() " + serverUp);
		return serverUp;
	}
};

function ExampleConnector() {

	// Local variables
	var callbackMethods;
	var connectionState = false;
	var loginState = false;
	var conferenceState = false;

	/**
	 * Establishes a connection with the remote service provider.
	 * Note: this is not to be confused with the Login command specified in the
	 * Command API which actually logs an agent into the provider system. Once a
	 * connection is established the Connector should establish a channel for receiving
	 * events.
	 *
	 * URL - location of remote service provider
	 * username - user entered string for identifying the user to the third party media provider.
	 * password - encrypted password string, refer to the password implications section.
	 * options - contains the OnOpen, OnClose and OnMessage callback functions.
	 *
	 * The OnMessage should be invoked whenever an event needs sent to the Toolbar Framework.
	 * Please refer to the Event API for proper formatting of the events.
	 *
	 * (OnOpen, OnMessage, OnClose will be invoked if passed in as part of parameters)
	 * OnOpen - when connection is established (currently a no-op)
	 * OnMessage - for any message to be delivered to the client (currently this
	 * method is used in lieu of OnOpen and OnClose and processing is based on
	 * message contents
	 * OnClose - when connection is closed. (currently a no-op)
	 */
	this.logon = function (serverURL, userName, password, callbackMethods){

		console.info("ExampleConnector.logon(" + serverURL + ", " + userName + ", " + password + ", " + callbackMethods + ")");
		console.log(callbackMethods);
		this.callbackMethods = callbackMethods;

		// Indicate a successful connection to service provider based
		this.connectionState = true;
		var event = "login response ok";
		var token = { reqType: "login", type: "response", msg: "ok", data: event };
		var data = { data: null};
		callbackMethods.OnMessage(data, token);

	};

	/**
	 * Returns boolean true if the client is currently connected.
	 */
	this.isConnected = function (){
		console.info("ExampleConnector.isConnected() " + this.connectionState);
		return this.connectionState;
	};

	/**
	 * Invoked following a browser refresh to determine if a re-login is required.
	 * Returns boolean true if a new login must be made.
	 */
	this.getServerRestarted = function(){
		console.info("ExampleConnector.getServerRestarted()");
		return false;
	};

	/**
	 * Terminates communications with the remote service provider
	 */
	this.logout = function(){
		console.info("ExampleConnector.logout()");
		this.loginState = false;
	};

	/**
	 * Close connection with server and clean up any resources allocated by
	 * the connector
	 */
	this.close = function(){
		console.info("ExampleConnector.close()");
		this.connectionState = false;
	};

	/**
	 * This is the primary function invoked by the toolbar framework to send the
	 * commands specified in the Command API to the remote provider service.
	 * Returns boolean true if the command was sent successfully.
	 *
	 * command - JSON object containing command arguments refer to Command API for details.
	 */
	this.sendToolbarCommand = function(command){
		console.info("ExampleConnector.sendToolbarCommand(" + command + ")");
		console.log(command);

		sourceId = "exampleSourceId"; // Origin identifier as established during handshake
		deviceName = command.DeviceName;
		userName = command.UserName;

		/*
		 * The Login command signs an Oracle Fusion CRM user into the telephony system.
		 */
		if (command.Operation == "Login") {
			agentGroup = command.Company;
			agentPassword = this.getPassword();
			console.log("Login using " +  userName + "/" + agentGroup + "/" + agentPassword);

			// Use the native Fusion chat client.
			// set to false if using the vendors own chat client.
			useFusionChat = true;

			// Get the customer Agent Connector Parameters
			// parameters must be declared in the Connector Type configuration and value set on the Agent Connector settings.
			agentExtension = command.agentExtension;

			this.loginState = true;

			// send AgentLoggedOn event
			// The AgentLoggedOn event is an agent state change to indicate a successful login to the telephony provider.
			this.sendToolbarEvent(
				{ EventName: "AgentLoggedOn", UseFusionChat: useFusionChat, UserName: userName, DeviceName: deviceName, MessageType: "AgentEvent"},
				sourceId);

			// send AgentReady event
			// The AgentReady event is an agent state change to indicate distributed interaction availability.
			this.sendToolbarEvent(
				{ EventName: "AgentReady", UserName: userName, DeviceName: deviceName, MessageType: "AgentEvent"},
				sourceId);
			return true;
		}

		/*
		 * The logout command signs out an Oracle Fusion CRM user from the telephony system.
		 */
		if (command.Operation == "Logout") {
			this.loginState = false;
			// send AgentLoggedOut event
			// The AgentLoggedOut event is an agent state change to indicate logged out of the telephony provider.
			this.sendToolbarEvent(
				{ EventName: "AgentLoggedOut", UserName: userName, DeviceName: deviceName, MessageType: "AgentEvent"},
				sourceId);
			return true;
		}

		/*
		 * The MakeReady command sets an Oracle Fusion CRM user ready to receive auto-distributed calls.
		 */
		if (command.Operation == "MakeReady") {
			// send AgentReady event
			// The AgentReady event is an agent state change to indicate distributed interaction availability.
			this.sendToolbarEvent(
				{ EventName: "AgentReady", UserName: userName, DeviceName: deviceName, MessageType: "AgentEvent"},
				sourceId);
			return true;
		}

		/*
		 * The MakeNotReady command sets an Oracle Fusion CRM user not ready to receive auto-distributed calls.
		 */
		if (command.Operation == "MakeNotReady") {
			// Break Reason Code matching a Break Reason Code delivered in the BreakReasons Event.
			breakReasonCd = command.BreakReasonCd;

			// send AgentReady event
			// The AgentNotReady event is an agent state change to indicate distributed interaction unavailability.
			this.sendToolbarEvent(
				{ EventName: "AgentNotReady", BreakReasonCd: breakReasonCd, UserName: userName, DeviceName: deviceName, MessageType: "AgentEvent"},
				sourceId);
			return true;
		}

		/*
		 * The GetConnectorCapability command requests the AgentConnectorCapability event containing command state mappings.
		 */
		if (command.Operation == "GetConnectorCapability") {

			// defauly capabilities
			// connectorCapability = ZccJSON.getJson().stringify(ZccTbAgent._defaultConnectorCapability);
			// Note that the Capabilities are passed in the event as a JSON formatted String
			connectorCapability = JSON.stringify({"ConnectorCapability":{"MediaCapability":[{"MediaState":[{"id":"Released","End":true,"SingleStepTransfer":false,"OffHold":false,"OnHold":false,"Consult":false,"Ignore":false,"Accept":false,"HangUp":false},{"id":"Established","SingleStepTransfer":true,"OffHold":false,"OnHold":true,"Consult":true,"Ignore":false,"Accept":false,"HangUp":true},{"id":"End","End":false,"SingleStepTransfer":false,"OffHold":false,"OnHold":false,"Consult":false,"Ignore":false,"Accept":false,"HangUp":false},{"id":"OnHold","SingleStepTransfer":false,"OffHold":true,"OnHold":false,"Consult":false,"Ignore":false,"Accept":false,"HangUp":true},{"id":"ConsultPending","SingleStepTransfer":false,"OffHold":false,"OnHold":false,"Consult":false,"Ignore":false,"Accept":false,"HangUp":false},{"id":"OnConference","SingleStepTransfer":false,"OffHold":false,"OnHold":false,"Consult":false,"Ignore":false,"Accept":false,"HangUp":false},{"id":"OnConsultation","SingleStepTransfer":false,"OffHold":false,"OnHold":false,"Consult":false,"Ignore":false,"Accept":false,"HangUp":false}],"level":"State"},{"MediaType":[{"MediaState":[{"id":"Delivered","SingleStepTransfer":false,"OffHold":false,"OnHold":false,"Consult":false,"Ignore":true,"Accept":true,"HangUp":false},{"id":"Established","SingleStepTransfer":true,"OffHold":false,"OnHold":true,"Consult":true,"Ignore":false,"Accept":false,"HangUp":true},{"id":"OffConference","SingleStepTransfer":true,"OffHold":false,"OnHold":true,"Consult":true,"Ignore":false,"Accept":false,"HangUp":true}],"id":"Phone"},{"MediaState":[{"id":"Delivered","SingleStepTransfer":false,"OffHold":false,"OnHold":false,"Consult":false,"Ignore":true,"Accept":true,"HangUp":false},{"id":"NewMessage","SingleStepTransfer":true,"OffHold":false,"OnHold":false,"Consult":false,"Ignore":false,"Accept":false,"HangUp":true},{"id":"Established","SingleStepTransfer":true,"OffHold":false,"OnHold":false,"Consult":false,"Ignore":false,"Accept":false,"HangUp":true},{"id":"OffConference","SingleStepTransfer":true,"OffHold":false,"OnHold":false,"Consult":false,"Ignore":false,"Accept":false,"HangUp":true}],"id":"Chat"}],"level":"MediaType"},{"level":"InteractionType","InteractionType":[{"MediaState":[{"id":"InitOutboundDial","SingleStepTransfer":false,"OffHold":false,"OnHold":false,"Consult":false,"Ignore":false,"Accept":false,"HangUp":true},{"id":"Delivered","SingleStepTransfer":false,"OffHold":false,"OnHold":false,"Consult":false,"Ignore":false,"Accept":false,"HangUp":true}],"id":"OutboundCall"}]}]}});

			// The AgentConnectorCapability event sends the mappings of supported commands for a given Media Type or Interaction Type and Interaction State.
			this.sendToolbarEvent(
				{ EventName: "AgentConnectorCapability", ConnectorCapability: connectorCapability, UserName: userName, DeviceName: deviceName, MessageType: "AgentEvent"},
				sourceId);
			return true;
		}

		/*
		 * The GetBreakReasons command requests the BreakReasons event containing Break Reasons.
		 */
		if (command.Operation == "GetBreakReasons") {

			// The break codes must align with the Break Reason configured in the Sales Cloud settings.
			// Setup and Maintenance > Manage Standard Lookups > ZCC_USER_BREAK_REASONS

			// The BreakReasons event sends the list of supported Break Reasons.
			this.sendToolbarEvent(
				{ EventName: "BreakReasons", UserName: userName, MessageType: "AgentEvent",
					"On Break":"6001", "Morning Coffee Break": "6002", "Lunch Break":"6003", "Afternoon Tea Break":"6004", "Break Dancing":"6005"},
				sourceId);

			return true;
		}

		/*
		 * The MakeCall command makes an outbound call and connects it with the Oracle Fusion CRM user?s phone.
		 */
		if (command.Operation == "MakeCall") {
			// send AgentBusy event
			// The AgentBusy event is an agent state change to indicate unavailability due to interaction related processing.
			this.sendToolbarEvent(
				{ EventName: "AgentBusy", UserName: userName, DeviceName: deviceName, MessageType: "AgentEvent"},
				sourceId);

			slot = command.slot;
			direction = "OUTBOUND";
			interactionType = "OutboundCall";
			tempCallId = command.MCT_MEDIA_ITEM_ID;
			callId = generateCallId();
			phoneNumber = command.MCT_PHONE_NUMBER;
			displayString = command.MCT_DISPLAY_STRING;
			ani = phoneNumber;
			dnis = "+1 888 555 1234"; // TODO set the appropriate "calling from number"

			// TODO: START THE OUTBOUND CALL
			// external API should be invoked here and the call connection responses should
			// be handled asynchronously. For the purponse of this example the success case
			// events are sent below:

			// send Delivered event
			// The Delivered event indicates a new interaction has been delivered to the agent.
			this.sendToolbarEvent(
				{ EventName: "Delivered", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
					slot: slot,
					TempCallId: tempCallId,
					MCT_MEDIA_ITEM_ID: callId, MCT_ANI: ani, MCT_DNIS: dnis,
					MCT_DISPLAY_STRING: displayString, MCT_PHONE_NUMBER: phoneNumber,
					MCT_INTERACTION_TYPE: interactionType, MCT_DIRECTION: direction, MCT_MEDIA_TYPE: "Phone"},
				sourceId);

			// send Established event
			// The Established event indicates a call to the agent is connected and active.  For example a new call has been answered or taken off hold.
			this.sendToolbarEvent(
				{ EventName: "Established", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
					slot: slot,
					MCT_MEDIA_ITEM_ID: callId, MCT_INTERACTION_TYPE: interactionType, MCT_MEDIA_TYPE: "Phone"},
				sourceId);

			return true;
		}

		/*
		 * The HangUp command disconnects an active call.
		 */
		if (command.Operation == "HangUp") {
			slot = command.slot;
			callId = command.MCT_MEDIA_ITEM_ID;
			interactionType = "InboundCall"; // TODO or OutboundCall, PreviewCall, WebCallback, ConsultationCall

			// TODO: HANG UP CALL
			// external API should be invoked here and the call connection responses should
			// be handled asynchronously. For the purponse of this example the success case
			// events are sent below:

			// send Released event
			// The Released event indicates a call with an agent has been disconnected.
			this.sendToolbarEvent(
				{ EventName: "Released", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
					slot: slot,
					MCT_MEDIA_ITEM_ID: callId, MCT_INTERACTION_TYPE: interactionType, MCT_MEDIA_TYPE: "Phone"},
				sourceId);

			if (conferenceState === true) {
				this.conferenceState = false;
				// send OffConference event
				// The OffConference event indicates a call with a consultant in consultation or conference has been disconnected.
				this.sendToolbarEvent(
					{ EventName: "OffConference", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
						slot: slot,
						MCT_MEDIA_ITEM_ID: callId},
					sourceId);
			}
			return true;
		}

		/*
		 * The OnHold command places an active call on hold.
		 */
		if (command.Operation == "OnHold") {
			slot = command.slot;
			callId = command.MCT_MEDIA_ITEM_ID;
			interactionType = "InboundCall"; // TODO or OutboundCall, PreviewCall, WebCallback, ConsultationCall

			// TODO: PLACE CALL ON HOLD
			// external API should be invoked here and the call connection responses should
			// be handled asynchronously. For the purponse of this example the success case
			// events are sent below:

			// send OnHold event
			// The OnHold event indicates an active call has been placed on hold.
			this.sendToolbarEvent(
				{ EventName: "OnHold", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
					slot: slot,
					MCT_MEDIA_ITEM_ID: callId, MCT_INTERACTION_TYPE: interactionType, MCT_MEDIA_TYPE: "Phone"},
				sourceId);
			return true;
		}

		/*
		 * The OffHold command resumes a call on hold.
		 */
		if (command.Operation == "OffHold") {
			slot = command.slot;
			callId = command.MCT_MEDIA_ITEM_ID;
			interactionType = "InboundCall"; // TODO or OutboundCall, PreviewCall, WebCallback, ConsultationCall

			// TODO: RETURN CALL OFF HOLD
			// external API should be invoked here and the call connection responses should
			// be handled asynchronously. For the purponse of this example the success case
			// events are sent below:

			// send Established event
			// The Established event indicates a call to the agent is connected and active.  For example a new call has been answered or taken off hold.
			this.sendToolbarEvent(
				{ EventName: "Established", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
					slot: slot,
					MCT_MEDIA_ITEM_ID: callId, MCT_INTERACTION_TYPE: interactionType, MCT_MEDIA_TYPE: "Phone"},
				sourceId);
			return true;
		}

		/*
		 * The accept command accepts a newly delivered call. It answers the phone in a ringing state.
		 */
		if (command.Operation == "Accept") {
			slot = command.slot;
			callId = command.MCT_MEDIA_ITEM_ID;
			interactionType = "InboundCall";

			// TODO: ACCEPT CALL
			// external API should be invoked here and the call connection responses should
			// be handled asynchronously. For the purponse of this example the success case
			// events are sent below:

			// send Established event
			// The Established event indicates a call to the agent is connected and active.  For example a new call has been answered or taken off hold.
			this.sendToolbarEvent(
				{ EventName: "Established", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
					slot: slot,
					MCT_MEDIA_ITEM_ID: callId, MCT_INTERACTION_TYPE: interactionType, MCT_MEDIA_TYPE: "Phone"},
				sourceId);
			return true;
		}

		/*
		 * The ignore command ignores the newly delivered call, functionality is provider specific.
		 */
		if (command.Operation == "Ignore") {
			slot = command.slot;
		    callId = command.MCT_MEDIA_ITEM_ID;
			interactionType = "InboundCall"; // TODO or OutboundCall, PreviewCall, WebCallback, ConsultationCall

			// TODO: IGNORE CALL
			// external API should be invoked here and the call connection responses should
			// be handled asynchronously. For the purponse of this example the success case
			// events are sent below:

			// send End event
			// The End event indicates a call with an agent has been terminated.
			this.sendToolbarEvent(
				{ EventName: "End", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
					slot: slot,
					MCT_MEDIA_ITEM_ID: callId, MCT_INTERACTION_TYPE: interactionType, MCT_MEDIA_TYPE: "Phone"},
				sourceId);

			// send AgentReady event
			// The AgentReady event is an agent state change to indicate distributed interaction availability.
			this.sendToolbarEvent(
				{ EventName: "AgentReady", UserName: userName, DeviceName: deviceName, MessageType: "AgentEvent"},
				sourceId);
			return true;
		}

		/*
		 * The end command terminates a call at the end of any post call wrap up processing
		 */
		if (command.Operation == "End") {
			slot = command.slot;
			callId = command.MCT_MEDIA_ITEM_ID;
			interactionType = "OutboundCall"; // TODO or InboundCall, PreviewCall, WebCallback, ConsultationCall

			// TODO: END CALL
			// external API should be invoked here and the call connection responses should
			// be handled asynchronously. For the purponse of this example the success case
			// events are sent below:

			// send End event
			// The End event indicates a call with an agent has been terminated.
			this.sendToolbarEvent(
				{ EventName: "End", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
					slot: slot,
					MCT_MEDIA_ITEM_ID: callId, MCT_INTERACTION_TYPE: interactionType, MCT_MEDIA_TYPE: "Phone"},
				sourceId);

			// send AgentReady event
			// The AgentReady event is an agent state change to indicate distributed interaction availability.
			this.sendToolbarEvent(
				{ EventName: "AgentReady", UserName: userName, DeviceName: deviceName, MessageType: "AgentEvent"},
				sourceId);
			return true;
		}

		/*
		 * The SingleStepTransfer makes an outbound call and transfers a currently active call to the new outbound call in one action
		 */
		if (command.Operation == "SingleStepTransfer") {
			// To Internal Agent or External Number
			slot = command.slot;
			callId = command.MCT_MEDIA_ITEM_ID;
			interactionType = "ConsultationCall";

			targetAgent = command.TargetAgent;
			targetUserId = command.TargetUserId;
			targetExtension = command.TargetExtension;

			// additional parameters
			noteText = command.MCT_NOTE_TEXT;
			organizationId = command.MCT_ORGANIZATION_ID;
			contactId = command.MCT_CONTACT_ID;
			displayString = command.MCT_DISPLAY_STRING;
			relationshipId = command.MCT_RELATIONSHIP_ID;

			// TODO: TRANSFER CALL
			// external API should be invoked here and the call connection responses should
			// be handled asynchronously. For the purponse of this example the success case
			// events are sent below:

			// send Released event
			// The Released event indicates a call with an agent has been disconnected.
			this.sendToolbarEvent(
				{ EventName: "Released", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
					slot: slot,
					MCT_MEDIA_ITEM_ID: callId, MCT_INTERACTION_TYPE: interactionType, MCT_MEDIA_TYPE: "Phone"},
				sourceId);
			return true;
		}

		/*
		 * The Consult command places the currently active call on hold and makes a new outbound call for consultation.
		 */
		if (command.Operation == "Consult") {
		  this.conferenceState = true;
			slot = command.slot;
			callId = command.MCT_MEDIA_ITEM_ID;
			interactionType = "ConsultationCall";

			targetAgent = command.TargetAgent;
			targetUserId = command.TargetUserId;
			targetExtension = command.TargetExtension;

			// additional parameters
			noteText = command.MCT_NOTE_TEXT;
			organizationId = command.MCT_ORGANIZATION_ID;
			contactId = command.MCT_CONTACT_ID;
			displayString = command.MCT_DISPLAY_STRING;
			relationshipId = command.MCT_RELATIONSHIP_ID;

			// TODO: START CONSULATATION CALL
			// external API should be invoked here and the call connection responses should
			// be handled asynchronously. For the purponse of this example the success case
			// events are sent below:

			// send OnHold event
			// The OnHold event indicates an active call has been placed on hold.
//			this.sendToolbarEvent(
//				{ EventName: "OnHold", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
//				MCT_MEDIA_ITEM_ID: callId, MCT_INTERACTION_TYPE: "ConsultationCall", MCT_MEDIA_TYPE: "Phone" },
//			sourceId);

			// send OnConsultation event
			// The OnConsultation event indicates that a consultation call has been initiated on behalf of the agent.
			this.sendToolbarEvent(
				{ EventName: "OnConsultation", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
					MCT_MEDIA_ITEM_ID: callId, MCT_INTERACTION_TYPE: "ConsultationCall", MCT_MEDIA_TYPE: "Phone"},
				sourceId);
			return true;
		}

		/*
		 * The Conference command conferences an active consultation call with the call on hold.
		 */
		if (command.Operation == "Conference") {
			this.conferenceState = true;
			callId = command.MCT_MEDIA_ITEM_ID;
			interactionType = "ConsultationCall";

			// send Conference event
			this.sendToolbarEvent(
				{ EventName: "OnConference", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
					MCT_MEDIA_ITEM_ID: callId, MCT_INTERACTION_TYPE: interactionType, MCT_MEDIA_TYPE: "Phone"},
				sourceId);

			// send Established event
			// The Established event indicates a call to the agent is connected and active.  For example a new call has been answered or taken off hold.
//			this.sendToolbarEvent(
//				{ EventName: "Established", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
//				MCT_MEDIA_ITEM_ID: callId, MCT_INTERACTION_TYPE: interactionType, MCT_MEDIA_TYPE: "Phone"},
//			sourceId);
			return true;
		}

		/*
		 * The CompleteTransfer command transfers a call on hold or in conference to the destination of the consultation call.
		 * Used as the second step of a two-step transfer flow or to leave a conference.
		 */
		if (command.Operation == "CompleteTransfer") {
			callId = command.MCT_MEDIA_ITEM_ID;
			interactionType = "ConsultationCall";

			// additional parameters
			noteText = command.MCT_NOTE_TEXT;
			organizationId = command.MCT_ORGANIZATION_ID;
			contactId = command.MCT_CONTACT_ID;
			displayString = command.MCT_DISPLAY_STRING;
			relationshipId = command.MCT_RELATIONSHIP_ID;

			// TODO: COMPLETE TRANSFER
			// external API should be invoked here and the call connection responses should
			// be handled asynchronously. For the purponse of this example the success case
			// events are sent below:

			// send Released event
			// The Released event indicates a call with an agent has been disconnected.
			this.sendToolbarEvent(
				{ EventName: "Released", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
					MCT_MEDIA_ITEM_ID: callId, MCT_INTERACTION_TYPE: interactionType, MCT_MEDIA_TYPE: "Phone"},
				sourceId);
			return true;
		}

		/*
		 * The Cancel command cancels a consultation call or conference and reestablishes the connection with the original call.
		 */
		if (command.Operation == "Cancel") {
			this.conferenceState = false;
			callId = '1002'; // TODO callId should be the Id of the consult call that is being cancelled.

			// send OffConference event
			// The OffConference event indicates a call with a consultant in consultation or conference has been disconnected.  This should occur as the result of the consultant hanging up or The Toolbar initiating a Cancel command.
			this.sendToolbarEvent(
				{ EventName: "OffConference", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
					MCT_MEDIA_ITEM_ID: callId},
				sourceId);

			// TODO: RE-ESTABLISH CALL WITH ORIGINAL CALLER

			// send Established event
			// The Established event indicates a call to the agent is connected and active.  For example a new call has been answered or taken off hold.
//			this.sendToolbarEvent(
//				{ EventName: "Established", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
//					slot: slot,
//					MCT_MEDIA_ITEM_ID: callId, MCT_INTERACTION_TYPE: interactionType, MCT_MEDIA_TYPE: "Phone"},
//				sourceId);
		}

		/*
		 * The UpdateData command updates the call data with application derived changes or additions
		 * FOR FUTURE USE - not currently supported.
		 */
		if (command.Operation == "UpdateData") {
			// additional parameters
			contactName = command.MCT_CONTACT_NAME;

			// TODO not implemented
			return true;
		}

		/*
		 * The ResendLastEvent command requests the provider to send the last event or sequence of events in case there is an active call.
		 */
		if (command.Operation == "ResendLastEvent") {
			// TODO
			return false;
		}

		/*
		 * The SetFocalInteraction command notifies the provider of a change to the current interaction focus on The Toolbar.
		 */
		if (command.Operation == "SetFocalInteraction") {
			callId = command.MCT_MEDIA_ITEM_ID;
			// send FocusInteraction event
			// The FocusInteraction event instructs toolbar to set teh specified interaction as the current interaction.
			this.sendToolbarEvent(
				{ EventName: "FocusInteraction", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
					MCT_MEDIA_ITEM_ID: callId, MCT_INTERACTION_TYPE: interactionType, MCT_MEDIA_TYPE: "Phone"},
				sourceId);

			return true;
		}

		/*
		 * The Send command sends chat and chat status changes from the Contact Center Toolbar Chat Client.
		 */
		if (command.Operation == "Send") {
			chatId = command.MCT_MEDIA_ITEM_ID;

			if (command.SendType == "Chat") {
				// Chat Message
				sendString = command.SendString;
				// TODO
			}
			if (command.SendType == "URL") {
				url = command.SendString;
				// TODO
			}
			if (command.SendType == "TypingStarted") {
				// TypingStarted
				// TODO
			}
			if (command.SendType == "TypingStopped") {
				// TypingStopped
				// TODO
			}

			return true;
		}

		/*
		 * The RequestTranscript command requests delivery of a Transcript event containing a complete chat conversation.
		 */
		if (command.Operation == "RequestTranscript") {
			chatId = command.MCT_MEDIA_ITEM_ID;
			contentType = "TEXT"; // or "URL"
			chatText = "[Me] Hello\n[You] Hi\n[Me] See ya\n[You] Goodbye";  // TODO
			mediaType = "Chat"; // TODO

			// send Transcript event
			// The Transcript event delivers the contents of a chat conversation or a URL to a chat conversation.
			this.sendToolbarEvent(
				{ EventName: "Transcript", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
					 ContentType: contentType, Text: chatText,
					 MCT_MEDIA_ITEM_ID: chatId, MCT_INTERACTION_TYPE: interactionType, MCT_MEDIA_TYPE: mediaType},
				sourceId);
			return true;
		}

		// unhandled operation
		return false;
	};

	/**
	 * Determine if the client is successfully authenticated with the remote service provider.
	 * Returns boolean to indicate current authentication status
	 */
	this.isLoggedIn = function() {
		console.info("ExampleConnector.isLoggedIn() " + this.loginState);
		return this.loginState;
	};

	/*
	 * Additional functions
	 */

	 /*
	  *helper function to send an event to the Toolbar
	  */
	this.sendToolbarEvent = function(event, sourceId) {
		console.info("ExampleConnector.sendToolbarEvent(" + event + ")");
		console.log(event);
		token = { sender: "ToolbarGateway", type: "toolbarResponse", name: "toolbarEventName", sourceId: sourceId,  data: event};
		data = { data: null};
		theConnector.callbackMethods.OnMessage(data, token);
	};

	// this is needed for IE.
	// used to convert an error from the telephoney server to a readable string?
	this.resultToString = function(result) {
		return "" + result;
	};


	/*
	 * helper function to get the users password
	 */
	this.getPassword = function() {
		return ZccTbMain.JSPassword;
	};
}


// TEST METHODS

/*
 * Inbound call simulation.
 * From the browser console enter inboundCall("15552224444", "18885551234", "John Smith")
 * where agentId is the connector userId. first number is the calling ID (MCT_ANI) and the
 * 2nd number is the dialed digets (dnis).  To screen pop a Contact the MCT_ANI must match
 * a contacts phone number in Fusion CRM.
 */
function inboundCall(ani, dnis, displayString) {
	direction = "INBOUND";
	interactionType = "InboundCall";
	mediaType = "Phone";
	sourceId = "exampleSourceId"; // Origin identifier as established during handshake
	deviceName = "myDevice"; // TODO
	callId = generateCallId();
	phoneNumber = ani; // TODO

	// send AgentBusy event
	theConnector.sendToolbarEvent(
		{ EventName: "AgentBusy", UserName: userName, DeviceName: deviceName, MessageType: "AgentEvent"},
		sourceId);

	// send Delivered event
	theConnector.sendToolbarEvent(
		{ EventName: "Delivered", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
			MCT_MEDIA_ITEM_ID: callId, MCT_ANI: ani, MCT_DNIS: dnis,
			MCT_DISPLAY_STRING: displayString, MCT_PHONE_NUMBER: phoneNumber,
			MCT_INTERACTION_TYPE: interactionType, MCT_DIRECTION: direction, MCT_MEDIA_TYPE: mediaType},
		sourceId);

	// send Established event
	theConnector.sendToolbarEvent(
		{ EventName: "Established", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
			MCT_MEDIA_ITEM_ID: callId, MCT_INTERACTION_TYPE: interactionType, MCT_MEDIA_TYPE: mediaType},
		sourceId);

}

/*
 * Outbound call simulation (call started from external device, i.e. not click to call)
 */
function outboundCall(ani, dnis, displayString) {
	direction = "OUTBOUND";
	interactionType = "OutboundCall";
	mediaType = "Phone";
	sourceId = "exampleSourceId"; // Origin identifier as established during handshake
	deviceName = "myDevice"; // TODO
	callId = generateCallId();
	phoneNumber = ani; // TODO

	// send AgentBusy event
	theConnector.sendToolbarEvent(
		{ EventName: "AgentBusy", UserName: userName, DeviceName: deviceName, MessageType: "AgentEvent"},
	 	sourceId);

	// send Delivered event
	theConnector.sendToolbarEvent(
		{ EventName: "Delivered", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
			MCT_MEDIA_ITEM_ID: callId, MCT_ANI: ani, MCT_DNIS: dnis,
			MCT_DISPLAY_STRING: displayString, MCT_PHONE_NUMBER: phoneNumber,
			MCT_INTERACTION_TYPE: "OutboundCall", MCT_DIRECTION: "OUTBOUND", MCT_MEDIA_TYPE: mediaType},
		sourceId);

	// send Established event
	theConnector.sendToolbarEvent(
		{ EventName: "Established", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
			MCT_MEDIA_ITEM_ID: callId, MCT_INTERACTION_TYPE: "OutboundCall", MCT_MEDIA_TYPE: mediaType},
		sourceId);

}


var chatId;

/*
 * Inbound chat simulation
 * From the browser console enter inboundChat("john.smith@example.com", "John Smith")
 * To screen pop a Contact the email must match a contacts email address in Fusion CRM.
 */
function inboundChat(email, displayString) {

	direction = "INBOUND";
	interactionType = "InboundChat";
	mediaType = "Chat";
	sourceId = "exampleSourceId"; // Origin identifier as established during handshake
	deviceName = "myDevice"; // TODO
	chatId = generateCallId();
	userName = null; // TODO

	// send AgentBusy event
	theConnector.sendToolbarEvent(
		{ EventName: "AgentBusy", UserName: userName, DeviceName: deviceName, MessageType: "AgentEvent"},
		sourceId);

  // send Delivered event
	theConnector.sendToolbarEvent(
		{ EventName: "Delivered", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
			MCT_MEDIA_ITEM_ID: chatId, MCT_DISPLAY_STRING: displayString, MCT_EMAIL: email,
			// MCT_PHONE_NUMBER: phoneNumber  // if you have it,  contact search algorithm checks phone 1st then email
			MCT_INTERACTION_TYPE: interactionType, MCT_DIRECTION: direction, MCT_MEDIA_TYPE: mediaType},
		sourceId);

	// send Established event
	theConnector.sendToolbarEvent(
		{ EventName: "Established", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
			MCT_MEDIA_ITEM_ID: chatId, MCT_INTERACTION_TYPE: interactionType, MCT_MEDIA_TYPE: mediaType},
		sourceId);
}



/*
 * Inbound Message simulation.
 * From the browser console enter inboundMessage("Hello")
 * An active chat session must be established first using inboundChat()
 */
function inboundMessage(message) {

	direction = "INBOUND";
	// chatId =
	interactionType = "InboundChat";
	mediaType = "Chat";
	userName = null; // TODO

	// send UserTyping event
	// The UserTyping event indicates the other party in a chat conversation began typing.
	theConnector.sendToolbarEvent(
		{ EventName: "UserTyping", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
			MCT_MEDIA_ITEM_ID: chatId, MCT_INTERACTION_TYPE: interactionType, MCT_MEDIA_TYPE: mediaType},
		sourceId);

	// send UserTypingStopped event
	// The UserTypingStopped event indicates the other party in a chat conversation stopped typing.
	theConnector.sendToolbarEvent(
		{ EventName: "UserTypingStopped", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
			MCT_MEDIA_ITEM_ID: chatId, MCT_INTERACTION_TYPE: interactionType, MCT_MEDIA_TYPE: mediaType},
		sourceId);

	// send NewMessage event
	// The NewMessage event indicates a new chat message was received.
	theConnector.sendToolbarEvent({ EventName: "NewMessage", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
		SendType: "Chat", SendString: message,
		MCT_MEDIA_ITEM_ID: chatId, MCT_INTERACTION_TYPE: interactionType, MCT_MEDIA_TYPE: mediaType},
	sourceId);

}


/*
 * For Bearer Authentication to access the Sales Cloud Web Services APIs the
 * JWT Token must be enabled by adding the following javascript expression language
 * snippet in the Sales Cloud Global Page template.
 *
 *	<script>var jwtToken="#{applCoreSecuredToken.trustToken}";</script>
 */

function soapPost(theUrl, data) {
	var xmlHttp = null;
	xmlHttp = new XMLHttpRequest();
	xmlHttp.open( "POST", theUrl, false );
	xmlHttp.setRequestHeader("content-type", "text/xml");
//	xmlHttp.setRequestHeader("Authorization", "Basic " + btoa(unescape(encodeURIComponent("username:password"))))
	xmlHttp.setRequestHeader("Authorization", "Bearer " + jwtToken);
	xmlHttp.send( data );
	return xmlHttp;
}

/*
 * Find Interaction by SwitchCallId - for Sales Cloud Release 8
 */
function findInteraction(switchCallId) {
	soapRequest = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:typ="http://xmlns.oracle.com/apps/crmCommon/interactions/interactionService/types/" xmlns:typ1="http://xmlns.oracle.com/adf/svc/types/"><soapenv:Header/><soapenv:Body><typ:findInteraction><typ:findCriteria><typ1:fetchStart>0</typ1:fetchStart><typ1:fetchSize>-1</typ1:fetchSize><typ1:filter><typ1:group><typ1:item><typ1:attribute>SwitchCallId</typ1:attribute><typ1:operator>=</typ1:operator><typ1:value>' + switchCallId + '</typ1:value></typ1:item></typ1:group></typ1:filter><typ1:findAttribute>InteractionId</typ1:findAttribute><typ1:findAttribute>OutcomeCode</typ1:findAttribute></typ:findCriteria><typ:findControl><typ1:retrieveAllTranslations>false</typ1:retrieveAllTranslations></typ:findControl></typ:findInteraction></soapenv:Body></soapenv:Envelope>';
	soapResponse = soapPost('/appCmmnCompInteractions/InteractionService', soapRequest);
	console.log(soapResponse.responseText);
}

/*
 * Find Activity by SwitchCallId - for Sales Cloud Release 9+
 */
function findActivity(switchCallId) {
	soapRequest = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:typ="http://xmlns.oracle.com/apps/crmCommon/activities/activityManagementService/types/" xmlns:typ1="http://xmlns.oracle.com/adf/svc/types/"> <soapenv:Header/> <soapenv:Body> <typ:findActivity> <typ:findCriteria> <typ1:fetchStart>0</typ1:fetchStart> <typ1:fetchSize>-1</typ1:fetchSize> <typ1:filter> <typ1:group> <typ1:item> <typ1:attribute>SwitchCallId</typ1:attribute> <typ1:operator>=</typ1:operator> <typ1:value>' + switchCallId +'</typ1:value> </typ1:item> </typ1:group> </typ1:filter> </typ:findCriteria> <typ:findControl> <typ1:retrieveAllTranslations>false</typ1:retrieveAllTranslations> </typ:findControl> </typ:findActivity> </soapenv:Body> </soapenv:Envelope>';
	soapResponse = soapPost('/appCmmnCompActivitiesActivityManagement/ActivityService', soapRequest);
	console.log(soapResponse.responseText);
}


// EVENT HANDLERS

/*
 * Process an inbound Hangup event from external system when the 3rd conference participant Hangs up.
 * Agent is returned to a single call with the original caller.
 * parameters:
 * callId - the MCT_MEDIA_ITEM_ID
 * sourceId - (optional) Origin identifier as established during handshake
 * userName - (optional)
 * deviceName - (optional)
 */
function inboundConsultationHangup (callId, sourceId, userName, deviceName) {
	// Handle the case if the call is in a conference.
	if (theConnector.conferenceState === true) {
		theConnector.conferenceState = false;
		// send OffConference event
		// The OffConference event indicates a call with a consultant in consultation or conference has been disconnected.
		theConnector.sendToolbarEvent(
			{ EventName: "OffConference", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
				MCT_MEDIA_ITEM_ID: callId},
			sourceId);
	}
}

/**
 * Process an inbound Delivered event from external system for a new call.
 * parameters:
 * callId - the MCT_MEDIA_ITEM_ID
 * interactionType - (optional)
 * sourceId - (optional) Origin identifier as established during handshake
 * userName - (optional)
 * deviceName - (optional)
 **/
function onDelivered(callId, direction, interactionType, displayString, phoneNumber, email, mediaType, sourceId, userName, deviceName) {
   // defaults
   direction = typeof direction !== 'undefined' ? direction : "INBOUND";
   interactionType = typeof interactionType !== 'undefined' ? interactionType : "InboundCall";
   mediaType = typeof mediaType !== 'undefined' ? mediaType : "Phone";

	// send Delivered event
	event ={ EventName: "Delivered", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
		MCT_MEDIA_ITEM_ID: callId,
		MCT_INTERACTION_TYPE: interactionType, MCT_DIRECTION: direction, MCT_MEDIA_TYPE: mediaType};

	if (typeof displayString !== 'undefined') { event.MCT_DISPLAY_STRING = displayString; }
	if (typeof email !== 'undefined') { event.MCT_EMAIL = email; }
	if (typeof phoneNumber !== 'undefined') { event.MCT_PHONE_NUMBER = phoneNumber; }

	theConnector.sendToolbarEvent(event, sourceId);
}

/**
 * Process an inbound Established event from external system to Connect the call.
 * parameters:
 * callId - the MCT_MEDIA_ITEM_ID
 * interactionType - (optional)
 * sourceId - (optional) Origin identifier as established during handshake
 * userName - (optional)
 * deviceName - (optional)
 **/
function onEstablished(callId, interactionType, mediaType, sourceId, userName, deviceName) {
   // defaults
   interactionType = typeof interactionType !== 'undefined' ? interactionType : "InboundCall";
   mediaType = typeof mediaType !== 'undefined' ? mediaType : "Phone";

	// send Established event
	theConnector.sendToolbarEvent(
		{ EventName: "Established", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
			MCT_MEDIA_ITEM_ID: callId, MCT_INTERACTION_TYPE: interactionType, MCT_MEDIA_TYPE: mediaType},
		sourceId);
}

/**
 * Process an inbound Hangup event from external system to Release the call.
 * parameters:
 * callId - the MCT_MEDIA_ITEM_ID
 * interactionType - (optional)
 * sourceId - (optional) Origin identifier as established during handshake
 * userName - (optional)
 * deviceName - (optional)
 **/
function onHangUp(callId, interactionType, mediaType, sourceId, userName, deviceName) {
   // defaults
   interactionType = typeof interactionType !== 'undefined' ? interactionType : "InboundCall";
   mediaType = typeof mediaType !== 'undefined' ? mediaType : "Phone";

	// send Released event
	// The Released event indicates a call with an agent has been disconnected.
	theConnector.sendToolbarEvent(
		{ EventName: "Released", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
			MCT_MEDIA_ITEM_ID: callId, MCT_INTERACTION_TYPE: interactionType, MCT_MEDIA_TYPE: mediaType},
		sourceId);
}

/**
 * Process an inbound Hold event from external system to Hold the call.
 * parameters:
 * callId - the MCT_MEDIA_ITEM_ID
 * interactionType - (optional)
 * sourceId - (optional) Origin identifier as established during handshake
 * userName - (optional)
 * deviceName - (optional)
 **/
function onHold(callId, interactionType, mediaType, sourceId, userName, deviceName) {
   // defaults
   interactionType = typeof interactionType !== 'undefined' ? interactionType : "InboundCall";
   mediaType = typeof mediaType !== 'undefined' ? mediaType : "Phone";

	// The OnHold event indicates an active call has been placed on hold.
	theConnector.sendToolbarEvent(
		{ EventName: "OnHold", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
			MCT_MEDIA_ITEM_ID: callId, MCT_INTERACTION_TYPE: interactionType, MCT_MEDIA_TYPE: mediaType },
		sourceId);
}

/**
 * Process an inbound Consult event from external system to place the call into Consultation.
 * parameters:
 * callId - the MCT_MEDIA_ITEM_ID
 * interactionType - (optional)
 * sourceId - (optional) Origin identifier as established during handshake
 * userName - (optional)
 * deviceName - (optional)
 **/
function onConsult(callId, interactionType, mediaType, sourceId, userName, deviceName) {
   // defaults
   interactionType = typeof interactionType !== 'undefined' ? interactionType : "ConsultationCall";
   mediaType = typeof mediaType !== 'undefined' ? mediaType : "Phone";

	// The OnConsultation event indicates that a consultation call has been initiated on behalf of the agent.
	theConnector.sendToolbarEvent(
		{ EventName: "OnConsultation", UserName: userName, DeviceName: deviceName, MessageType: "InteractionEvent",
			MCT_MEDIA_ITEM_ID: callId, MCT_INTERACTION_TYPE: interactionType, MCT_MEDIA_TYPE: mediaType},
		sourceId);
}


/*
 * generates a new unique call Id
 * for example purposes only - uses the current time
 * NOTE: CallId must be a Long value returned as a String in R8 and R9
 */
function generateCallId() {
	return "" + new Date().getTime();
}
