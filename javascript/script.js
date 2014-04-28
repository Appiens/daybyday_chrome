
    function check(e) {
        var input = e.srcElement;
        if (input.value != document.getElementById('email_addr').value) {
            input.setCustomValidity('The two email addresses must match.');
        } else {
            // input is valid -- reset the error message
            input.setCustomValidity('');
        }
    }
	
	function func()
	{
/*	   chrome.extension.sendRequest({
  "greeting": "hello",
  "var1": "variable 1",  //string
  "var2": true           //boolean
	});*/
     var fn = document.getElementById('full_name').value;
     var em =  document.getElementById('email_addr').value;

	 chrome.runtime.sendMessage({greeting: "changeData", fullName:  fn, emailAddr: em}, function(response)
	  {
        console.log('This function is called when I get the response ' + response.fullName + ' ' + response.emailAddr);
	  }
	);
  }
  
   function clickHandler(e) 
   {
     setTimeout(func, 1000);
   }

    function inputHandler(e)
    {
        document.getElementById('total').value = (document.getElementById('nights').valueAsNumber * 99) + ((document.getElementById('guests').valueAsNumber - 1) * 10);
    }
  
  // Add event listeners once the DOM has fully loaded by listening for the
// `DOMContentLoaded` event on the document, and adding your listeners to
// specific elements when it triggers.
  document.addEventListener('DOMContentLoaded', OnDOMContentLoaded);
  
  function OnDOMContentLoaded() 
  {
      //Get Reference to Functions
      var backGround = chrome.extension.getBackgroundPage();
      //Call Function
      backGround.AskForTasks();
      chrome.runtime.onMessage.addListener(OnTasksReady);

    //  document.getElementById('email_addr_repeat').addEventListener('input', check);
      document.getElementById('form').addEventListener('input', inputHandler);
      document.getElementById('button').addEventListener('click', clickHandler);
	//  requestData();
  }

  function requestData()
  {
      chrome.runtime.sendMessage({greeting: "giveMeData"}, function(response)	  
	  {
        console.log('This function is called when I get the responce ' + response.fullName + ' ' + response.emailAddr);
        document.getElementById('full_name').value = response.fullName;
        document.getElementById('email_addr').value = response.emailAddr;
	  }
	);
  }

  function OnTasksReady(request, sender, sendResponse)
  {
      if (request.greeting == "giveMeData")
      {
          var x = document.getElementById("email_addr");
          var backGround = chrome.extension.getBackgroundPage();
          //Call Function
          var taskLists = backGround.taskLists;

          for (var i = 0, cal; cal = taskLists[i]; i++)
          {
              var option = document.createElement("option");
              option.text = cal.title;
              x.add(option,x[0]);
          }
      }
  }

	
