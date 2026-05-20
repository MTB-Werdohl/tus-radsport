self.addEventListener(
  'install',
  () => {

    console.log(
      'Service Worker installiert'
    );

    self.skipWaiting();

  }
);

self.addEventListener(
  'activate',
  event => {

    event.waitUntil(

      clients.claim()

    );

  }
);

self.addEventListener(
  'push',
  event => {

    let data = {

      title:'MTB Werdohl',

      body:'Neue Mitteilung',

      url:'/'

    };

    try{

      if(event.data){

        data =
          event.data.json();

      }

    }catch(error){

      console.error(
        error
      );

    }

    event.waitUntil(

      self.registration
      .showNotification(

        data.title,

        {

          body:
            data.body,

          icon:
            '/assets/images/icon-192.png',

          badge:
            '/assets/images/icon-192.png',

          vibrate:
            [200,100,200],

          requireInteraction:
            true,

          data:{

            url:
              data.url

          }

        }

      )

    );

  }
);

self.addEventListener(
  'notificationclick',
  event => {

    event.notification.close();

    event.waitUntil(

      (async()=>{

        const url =

          event
          .notification
          .data
          ?.url ||

          '/';

        const clientList =

          await clients
          .matchAll({

            type:'window',

            includeUncontrolled:
              true

          });

        for(
          const client
          of clientList
        ){

          client.postMessage({

            type:
              'PUSH_OPENED'

          });

          if(
            'focus'
            in client
          ){

            await client.focus();

            return;

          }

        }

        if(
          clients.openWindow
        ){

          return clients
          .openWindow(
            url
          );

        }

      })()

    );

  }
);