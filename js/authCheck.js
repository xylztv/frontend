import { API_URL } from "./config.js";

async function validateUser() {
  const justLoggedIn = localStorage.getItem('justLoggedIn');
  const userToken = localStorage.getItem('userToken')
  if (!userToken){
    // User is not logged in
    console.log("not logged in");
    // Show elements with the .loggedOutButtons class
    const loggedOutButtons = document.querySelectorAll('.loggedOutButtons');
    const loggedInButtons = document.querySelectorAll('.loggedInButton');
    for (const button of loggedOutButtons) {
      button.style.display = 'block';
    }
    for (const button of loggedInButtons){
      button.style.display = 'none';
    }
    return;
  }
  if (userToken){
        // Hide elements with the .loggedOutButtons class
        const loggedOutButtons = document.querySelectorAll('.loggedOutButtons');
        const loggedInButtons = document.querySelectorAll('.loggedInButton');
    for (const button of loggedOutButtons){
      button.style.display = 'none';
    }
    for (const button of loggedInButtons){
      button.style.display = 'block';
    }
  }
  const response = await fetch(`${API_URL}/rest/validateUser`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('userToken')}`
    }
  });
  
  const loggedIn = response.status === 200;

  if (loggedIn) {
    // User is logged in
    console.log("logged in");
    if (justLoggedIn) {
      toastr.success('Successfully logged in!');
      localStorage.removeItem('justLoggedIn'); // Remove the flag after showing the message
    }
    // Hide elements with the .loggedOutButtons class
    const loggedOutButtons = document.querySelectorAll('.loggedOutButtons');
    const loggedInButtons = document.querySelectorAll('.loggedInButton');
    for (const button of loggedOutButtons) {
      button.style.display = 'none';
    }
    for (const button of loggedInButtons){
      button.style.display = 'block';
    }
  } else {
    // User is not logged in
    console.log("not logged in");
    // Show elements with the .loggedOutButtons class
    const loggedOutButtons = document.querySelectorAll('.loggedOutButtons');
    const loggedInButtons = document.querySelectorAll('.loggedInButton');
    for (const button of loggedOutButtons) {
      button.style.display = 'block';
    }
    for (const button of loggedInButtons){
      button.style.display = 'none';
    }
  }
}
validateUser()