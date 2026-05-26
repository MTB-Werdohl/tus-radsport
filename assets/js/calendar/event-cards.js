async function loadCards(
  start,
  end
){

  const wrapper =
    document.getElementById(
      'event-cards'
    );

  if (!wrapper) return;

  let data;

  try {

    data = await fetchTermine();

  } catch (error) {

    console.error(error);

    return;

  }

  wrapper.innerHTML='';

  const cards=[];

  data.forEach(item=>{

    if(item.recurring){

      const recurringEnd =

  item.endRecur

  ?

  new Date(
    item.endRecur
  )

  :

  null;

      const current=
        new Date(start);

      while(current<end){

        const date=

`${

current.getFullYear()

}-${
String(
current.getMonth()+1
).padStart(
2,
'0'
)

}-${
String(
current.getDate()
).padStart(
2,
'0'
)

}`;

        const excluded=

          item.exclude
          ?.includes(date);

        const validDay=

          item.daysOfWeek
          ?.includes(
            current.getDay()
          );

        if(

 validDay &&

 !excluded &&

 (

   !recurringEnd ||

   current <= recurringEnd

 )

){

          cards.push({

            ...item,

            generatedDate:

            new Date(current)

          });

        }

        current.setDate(

          current.getDate()+1

        );

      }

      return;

    }

    const eventDate=

      new Date(item.date);

    if(

      eventDate>=start &&

      eventDate<end

    ){

      cards.push(item);

    }

  });

  cards.sort(

    (a,b)=>{

      const first=

        a.generatedDate ||

        new Date(a.date);

      const second=

        b.generatedDate ||

        new Date(b.date);

      return first-second;

    }

  );

  const now=
    new Date();

  now.setHours(
  0,
  0,
  0,
  0
  );

  const visibleCards=

    cards.filter(

      event=>{

        const date=

          event.generatedDate ||

          new Date(
            event.date
          );

        return date>=now;

      }

    );

  visibleCards.forEach(event=>{

    const card=

      document.createElement(
        'article'
      );

    card.className=

      'calendar-card';

    const category=
      getTerminCategory(event.category);

    card.innerHTML=`

<a

href="/kalender/${event.slug}/"

>

<div>

<h3>

${category.icon}

${event.title}

</h3>

<p>

🗓️

${formatCardDate(event)}

${

event.location

?

` · 📍 ${event.location}`

:''

}

</p>

</div>

</a>

`;

    wrapper.appendChild(
      card
    );

  });

}
