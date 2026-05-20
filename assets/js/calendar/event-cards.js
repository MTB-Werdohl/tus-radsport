async function loadCards(
  start,
  end
){

  const wrapper =
    document.getElementById(
      'event-cards'
    );

  if (!wrapper) return;

  const { data, error } =
    await supabaseClient

      .from('Termine')

      .select('*');

  if (error){

    console.error(error);

    return;

  }

  wrapper.innerHTML='';

  const cards=[];

  data.forEach(item=>{

    if(item.recurring){

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

          !excluded

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

  cards.forEach(event=>{

    const card=

      document.createElement(
        'article'
      );

    card.className=

      'calendar-card';

    card.innerHTML=`

<a

href="/event.html?slug=${event.slug}"

>

<div

class="calendar-dot"

></div>

<div>

<h3>

${event.title}

</h3>

<p>

${formatCardDate(
event
)}

</p>

</div>

</a>

`;

    wrapper.appendChild(
      card
    );

  });

}