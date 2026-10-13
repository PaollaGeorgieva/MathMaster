export default function ResourceState({ resource }) {
  if (resource.loading) return <p role="status">Зареждане…</p>
  if (resource.error) return <div role="alert" className="feedback"><p>{resource.error}</p><button onClick={resource.reload}>Опитай отново</button></div>
  return null
}
