document.addEventListener('DOMContentLoaded', function() {
  const userToken = localStorage.getItem('userToken');
  const justLoggedIn = localStorage.getItem('justLoggedIn');

  if (userToken) {
      // User is logged in
      console.log("logged in");
      if (justLoggedIn) {
          toastr.success('Successfully logged in!');
          localStorage.removeItem('justLoggedIn'); // Remove the flag after showing the message
      }
      document.getElementById('loggedOutButtons').style.display = 'none';
      document.getElementById('loggedInButton').style.display = 'block';
  } else {
      // User is not logged in
      console.log("not logged in");
      document.getElementById('loggedOutButtons').style.display = 'block';
      document.getElementById('loggedInButton').style.display = 'none';
  }
});
