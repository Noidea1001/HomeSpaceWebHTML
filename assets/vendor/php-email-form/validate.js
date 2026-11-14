/**
* PHP Email Form Validation - v3.11
* URL: https://bootstrapmade.com/php-email-form/
* Author: BootstrapMade.com
*/
(function () {
  "use strict";

  let forms = document.querySelectorAll('.php-email-form');

  forms.forEach( function(e) {
    e.addEventListener('submit', function(event) {
      event.preventDefault();

      let thisForm = this;

      let action = thisForm.getAttribute('action');
      let recaptcha = thisForm.getAttribute('data-recaptcha-site-key');
      
      if( ! action ) {
        displayError(thisForm, 'The form action property is not set!');
        return;
      }
      thisForm.querySelector('.loading').classList.add('d-block');
      thisForm.querySelector('.error-message').classList.remove('d-block');
      thisForm.querySelector('.sent-message').classList.remove('d-block');

      let formData = new FormData( thisForm );

      if ( recaptcha ) {
        if(typeof grecaptcha !== "undefined" ) {
          grecaptcha.ready(function() {
            try {
              grecaptcha.execute(recaptcha, {action: 'php_email_form_submit'})
              .then(token => {
                formData.set('recaptcha-response', token);
                php_email_form_submit(thisForm, action, formData);
              })
            } catch(error) {
              displayError(thisForm, error);
            }
          });
        } else {
          displayError(thisForm, 'The reCaptcha javascript API url is not loaded!')
        }
      } else {
        php_email_form_submit(thisForm, action, formData);
      }
    });
  });

  function php_email_form_submit(thisForm, action, formData) {
    // Capture inquiry data
    const inquiry = {
      id: 'inq-' + Date.now(),
      date: new Date().toISOString(),
      name: formData.get('name') || '',
      email: formData.get('email') || '',
      phone: formData.get('phone') || '',
      subject: formData.get('subject') || 'General Inquiry',
      message: formData.get('message') || '',
      page: window.location.pathname
    };

    function saveInquiryLocally() {
      try {
        const list = JSON.parse(localStorage.getItem('homespace_inquiries') || '[]');
        list.unshift(inquiry);
        localStorage.setItem('homespace_inquiries', JSON.stringify(list));
      } catch (e) {
        console.warn('Could not store inquiry locally', e);
      }

      // Sync to Supabase Cloud if configured
      if (window.HomeSpaceCloud && window.HomeSpaceCloud.isConfigured()) {
        window.HomeSpaceCloud.submitInquiry({
          name: inquiry.name,
          email: inquiry.email,
          phone: inquiry.phone,
          subject: inquiry.subject,
          message: inquiry.message
        }).catch(err => console.warn('Supabase inquiry sync error', err));
      }
    }

    fetch(action, {
      method: 'POST',
      body: formData,
      headers: {'X-Requested-With': 'XMLHttpRequest'}
    })
    .then(response => {
      if( response.ok ) {
        return response.text();
      } else {
        // Fallback for static hosting (GitHub Pages, static Nginx) where PHP is unavailable
        if (response.status === 405 || response.status === 404 || response.status === 501) {
          saveInquiryLocally();
          return 'OK';
        }
        throw new Error(`${response.status} ${response.statusText} ${response.url}`); 
      }
    })
    .then(data => {
      thisForm.querySelector('.loading').classList.remove('d-block');
      if (data.trim() == 'OK') {
        saveInquiryLocally();
        const sentMsg = thisForm.querySelector('.sent-message');
        if (sentMsg) {
          sentMsg.innerHTML = 'Thank you! Your message has been sent successfully. An advisor will contact you shortly.';
          sentMsg.classList.add('d-block');
        }
        thisForm.reset(); 
      } else {
        throw new Error(data ? data : 'Form submission failed and no error message returned from: ' + action); 
      }
    })
    .catch((error) => {
      // In offline or static hosting without backend, save inquiry locally and show confirmation
      saveInquiryLocally();
      thisForm.querySelector('.loading').classList.remove('d-block');
      const sentMsg = thisForm.querySelector('.sent-message');
      if (sentMsg) {
        sentMsg.innerHTML = 'Thank you! Your message has been sent. An advisor will contact you shortly.';
        sentMsg.classList.add('d-block');
      }
      thisForm.reset();
    });
  }

  function displayError(thisForm, error) {
    thisForm.querySelector('.loading').classList.remove('d-block');
    thisForm.querySelector('.error-message').innerHTML = error;
    thisForm.querySelector('.error-message').classList.add('d-block');
  }

})();
