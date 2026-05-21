function buildShareButton(
  containerId,
  title
){

  const container =

    document.getElementById(
      containerId
    );

  if(!container){
    return;
  }

const button =

  document.createElement(
    'div'
  );

button.className =
  'share-button';

button.innerHTML =

  '↗ Teilen';

  button.onclick =
    async()=>{

      const shareData = {

        title:

          title ||

          document.title,

        text:

          title ||

          document.title,

        url:

          window.location.href

      };

      try{

        if(

          navigator.share

        ){

          await navigator.share(
            shareData
          );

          return;

        }

        await navigator.clipboard
          .writeText(

            window.location.href

          );

        alert(

          'Link kopiert'

        );

      }

      catch(error){

        console.error(
          error
        );

      }

    };

  container.appendChild(
    button
  );

}