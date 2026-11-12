// «·» entre datos de una línea: decorativo para el lector, que oye la coma sr-only en su lugar.
const DotSeparator = () => (
  <>
    <span aria-hidden="true" className="font-normal text-muted-foreground">
      ·
    </span>
    <span className="sr-only">, </span>
  </>
)

export default DotSeparator
