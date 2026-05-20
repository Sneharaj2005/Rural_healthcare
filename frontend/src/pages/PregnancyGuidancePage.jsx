import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { FaBookMedical, FaChevronRight, FaArrowLeft, FaTags } from 'react-icons/fa'
import api from '../lib/axios'
import LoadingSpinner from '../components/common/LoadingSpinner'

export default function PregnancyGuidancePage() {
  const [selectedCategory, setSelectedCategory] = useState(null)
  const { t } = useTranslation()

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-3">
        {selectedCategory && (
          <button onClick={() => setSelectedCategory(null)}
            className="p-2 hover:bg-gray-100 rounded-full transition">
            <FaArrowLeft className="text-gray-600" />
          </button>
        )}
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FaBookMedical className="text-rose-500" />
          {selectedCategory ? `${t(`guidance_content.categories.${selectedCategory}`, selectedCategory)} ${t('guidance.guidance')}` : t('nav.guidance')}
        </h1>
      </div>

      {!selectedCategory ? (
        <CategoryList onSelect={setSelectedCategory} />
      ) : (
        <ArticleList category={selectedCategory} />
      )}
    </div>
  )
}

function CategoryList({ onSelect }) {
  const { i18n, t } = useTranslation()
  const lang = i18n.language || 'en'
  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['guidance-categories', lang],
    queryFn: async () => {
      const res = await api.get(`/guidance/categories?lang=${lang}`)
      return res.data
    },
    retry: false,
  })

  if (isLoading) return <LoadingSpinner />
  if (error) return (
    <div className="text-center py-10">
      <p className="text-red-500 font-medium">{t('guidance.failedCategories')}</p>
      <p className="text-sm text-gray-500 mt-1">{t('guidance.checkServer')}</p>
    </div>
  )

  if (!categories || categories.length === 0) {
    return <div className="text-gray-500 text-center py-10">{t('guidance.noCategories')}</div>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
      {categories.map((cat) => (
        <div 
          key={cat.category}
          onClick={() => onSelect(cat.category)}
          className="bg-white border border-rose-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-rose-300 transition cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="text-3xl">{cat.icon || '📘'}</div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg group-hover:text-rose-600 transition">{t(`guidance_content.categories.${cat.category}`, cat.category)}</h3>
              <p className="text-sm text-gray-500">{cat.article_count} {cat.article_count === 1 ? t('guidance.article') : t('guidance.articles')}</p>
            </div>
          </div>
          <FaChevronRight className="text-gray-300 group-hover:text-rose-400 transition" />
        </div>
      ))}
    </div>
  )
}

function ArticleList({ category }) {
  const { i18n, t } = useTranslation()
  const lang = i18n.language || 'en'
  const { data: articles, isLoading, error } = useQuery({
    queryKey: ['guidance-articles', category, lang],
    queryFn: async () => {
      const res = await api.get(`/guidance/category/${encodeURIComponent(category)}?lang=${lang}`)
      return res.data
    },
    retry: false,
  })

  if (isLoading) return <LoadingSpinner />
  if (error) return (
    <div className="text-center py-10">
      <p className="text-red-500 font-medium">{t('guidance.failedArticles')}</p>
      <p className="text-sm text-gray-500 mt-1">{t('guidance.checkServer')}</p>
    </div>
  )

  return (
    <div className="space-y-6 mt-6">
      {articles.map((article) => (
        <div key={article.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="text-4xl shrink-0 mt-1">{article.icon || '📄'}</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-800 mb-3">{t(`guidance_content.titles.${article.title}`, article.title)}</h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                {t(`guidance_content.contents.${article.content}`, article.content)}
              </p>
              {article.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {article.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-medium">
                      <FaTags className="text-[10px] opacity-70" /> {t(`guidance.tags.${tag}`, tag)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
