// Authentication form handling
document.addEventListener('DOMContentLoaded', function() {
    // Customer Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const loginBtn = document.getElementById('loginBtn');
            const btnText = loginBtn.querySelector('.btn-text');
            const btnLoading = loginBtn.querySelector('.btn-loading');
            
            // Show loading state
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline-block';
            loginBtn.disabled = true;

            const formData = {
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
            };

            try {
                const response = await fetch('/.netlify/functions/customer-login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (result.success) {
                    // Save user data and token
                    localStorage.setItem('sunrise_customer', JSON.stringify(result.user));
                    localStorage.setItem('sunrise_token', result.token);
                    
                    // Redirect to dashboard
                    window.location.href = 'dashboard.html';
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                alert('Login failed: ' + error.message);
            } finally {
                // Reset button state
                btnText.style.display = 'inline-block';
                btnLoading.style.display = 'none';
                loginBtn.disabled = false;
            }
        });
    }
    
    // Customer Signup Form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const signupBtn = document.getElementById('signupBtn');
            const btnText = signupBtn.querySelector('.btn-text');
            const btnLoading = signupBtn.querySelector('.btn-loading');
            
            // Show loading state
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline-block';
            signupBtn.disabled = true;

            const formData = {
                fullName: document.getElementById('fullName').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                password: document.getElementById('password').value
            };

            // Validation
            const confirmPassword = document.getElementById('confirmPassword').value;
            if (formData.password !== confirmPassword) {
                alert('Passwords do not match!');
                btnText.style.display = 'inline-block';
                btnLoading.style.display = 'none';
                signupBtn.disabled = false;
                return;
            }

            try {
                const response = await fetch('/.netlify/functions/customer-signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (result.success) {
                    alert('Account created successfully! Please log in.');
                    window.location.href = 'login.html';
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                alert('Signup failed: ' + error.message);
            } finally {
                // Reset button state
                btnText.style.display = 'inline-block';
                btnLoading.style.display = 'none';
                signupBtn.disabled = false;
            }
        });
    }
    
    // Staff Login Form
    const staffLoginForm = document.getElementById('staffLoginForm');
    if (staffLoginForm) {
        staffLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const loginBtn = document.getElementById('staffLoginBtn');
            const btnText = loginBtn.querySelector('.btn-text');
            const btnLoading = loginBtn.querySelector('.btn-loading');
            
            // Show loading state
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline-block';
            loginBtn.disabled = true;

            const formData = {
                staffId: document.getElementById('staffId').value,
                password: document.getElementById('password').value
            };

            try {
                const response = await fetch('/.netlify/functions/staff-login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (result.success) {
                    // Save staff data and token
                    localStorage.setItem('sunrise_staff', JSON.stringify(result.staff));
                    localStorage.setItem('sunrise_staff_token', result.token);
                    
                    // Redirect to staff dashboard
                    window.location.href = 'dashboard.html';
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                alert('Login failed: ' + error.message);
            } finally {
                // Reset button state
                btnText.style.display = 'inline-block';
                btnLoading.style.display = 'none';
                loginBtn.disabled = false;
            }
        });
    }
    
    // Admin Login Form
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const loginBtn = document.getElementById('adminLoginBtn');
            const btnText = loginBtn.querySelector('.btn-text');
            const btnLoading = loginBtn.querySelector('.btn-loading');
            
            // Show loading state
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline-block';
            loginBtn.disabled = true;

            const formData = {
                username: document.getElementById('username').value,
                password: document.getElementById('password').value
            };

            try {
                const response = await fetch('/.netlify/functions/admin-login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (result.success) {
                    // Save admin data and token
                    localStorage.setItem('sunrise_admin', JSON.stringify(result.admin));
                    localStorage.setItem('sunrise_admin_token', result.token);
                    
                    // Redirect to admin dashboard
                    window.location.href = 'dashboard.html';
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                alert('Login failed: ' + error.message);
            } finally {
                // Reset button state
                btnText.style.display = 'inline-block';
                btnLoading.style.display = 'none';
                loginBtn.disabled = false;
            }
        });
    }
});

// Reuse validation function from main.js
function validateForm(formData) {
    const errors = [];
    
    if (!formData.email) {
        errors.push('Email is required');
    } else if (!isValidEmail(formData.email)) {
        errors.push('Please enter a valid email');
    }
    
    if (!formData.password) {
        errors.push('Password is required');
    } else if (formData.password.length < 6) {
        errors.push('Password must be at least 6 characters');
    }
    
    return errors;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}