   var myGuest = function()
   {
    this.fullName = 'aaa';
    this.emailAddr = 'bbb';
    this.emailAddrRepeat = '';
    this.arrivalDate = new Date();
    this.numberOfNights = 1;
    this.numberOfGuests = 1;
    this.promo = '';
   }

   myGuest.prototype.getFullName = function()
  {
     return this.fullName;
  }

  myGuest.prototype.setFullName = function(fullName)
  {
      this.fullName = fullName;
  }
  
  myGuest.prototype.getEmailAddr = function()
  {
     return this.emailAddr;
  }

  myGuest.prototype.setEmailAddr = function(emailAddr)
  {
     this.emailAddr = emailAddr;
  }


  